// Throwaway RED stub: answers the wrong body and has no pipeline.
export async function GET(): Promise<Response> {
  return Response.json({ status: 'down' });
}
