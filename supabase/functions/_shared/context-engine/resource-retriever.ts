export interface RetrievedResourceChunk {
  page: number;
  text: string;
  resourceTitle: string;
}

export interface ResourceRetrievalOptions {
  userId: string;
  resourceId: string;
  query?: string;
  pageNumber?: number;
  limit?: number;
  maxCharactersPerPage?: number;
}

export interface ResourceRetrievalResult {
  chunks: RetrievedResourceChunk[];
  reason?: "missing_resource" | "missing_query_or_page" | "no_matching_content";
}

/**
 * Retrieves a small amount of resource text on demand.
 *
 * Security: first verifies that the resource belongs to the authenticated user.
 * resource_pages has no owner_id column; ownership is established through
 * lucid_resources.owner_id before any page content is read.
 *
 * This is keyword retrieval (ILIKE), not semantic/vector RAG.
 */
export async function retrieveResourceContext(
  supabase: { from: (table: string) => any },
  options: ResourceRetrievalOptions,
): Promise<ResourceRetrievalResult> {
  const userId = options.userId.trim();
  const resourceId = options.resourceId.trim();
  const query = options.query?.trim() ?? "";
  const pageNumber = options.pageNumber;
  const limit = Math.min(Math.max(options.limit ?? 4, 1), 8);
  const maxCharacters = Math.min(Math.max(options.maxCharactersPerPage ?? 3500, 500), 6000);

  if (!userId || !resourceId) return { chunks: [], reason: "missing_resource" };
  if (pageNumber === undefined && query.length < 2) {
    return { chunks: [], reason: "missing_query_or_page" };
  }
  if (pageNumber !== undefined && (!Number.isInteger(pageNumber) || pageNumber < 1)) {
    return { chunks: [], reason: "missing_query_or_page" };
  }

  const { data: resource, error: resourceError } = await supabase
    .from("lucid_resources")
    .select("id,title,owner_id")
    .eq("id", resourceId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (resourceError) throw new Error("Unable to verify resource ownership.");
  if (!resource) return { chunks: [], reason: "missing_resource" };

  let pageQuery = supabase
    .from("resource_pages")
    .select("page_number,text_content")
    .eq("resource_id", resourceId);

  if (pageNumber !== undefined) {
    pageQuery = pageQuery.eq("page_number", pageNumber);
  } else {
    // Escape ILIKE wildcards so user input is treated as literal search text.
    const safeQuery = query.replace(/[\\%_]/g, (character) => `\\\\${character}`);
    pageQuery = pageQuery.ilike("text_content", `%${safeQuery}%`);
  }

  const { data: pages, error: pageError } = await pageQuery
    .order("page_number", { ascending: true })
    .limit(limit);

  if (pageError) throw new Error("Unable to retrieve resource content.");

  const chunks = (pages ?? [])
    .filter((page: { text_content?: string | null }) => Boolean(page.text_content?.trim()))
    .map((page: { page_number: number; text_content: string }) => ({
      page: page.page_number,
      text: page.text_content.slice(0, maxCharacters),
      resourceTitle: resource.title,
    }));

  return chunks.length
    ? { chunks }
    : { chunks: [], reason: "no_matching_content" };
}
