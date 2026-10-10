// The mock HTTP namespace is deliberate. Replace this adapter with authenticated
// production routes without changing the four domain objects or screen components.
export async function demoRequest(operation, body) {
  const response = await fetch(`/api/demo/${operation}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'The demo request failed. Try again.');
  return result;
}
