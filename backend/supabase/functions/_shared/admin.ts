export function isAdminAuthenticated(req: Request): boolean {
  const username = req.headers.get('x-admin-username');
  const password = req.headers.get('x-admin-password');

  const expectedUsername = Deno.env.get('ADMIN_USERNAME');
  const expectedPassword = Deno.env.get('ADMIN_PASSWORD');

  if (!expectedUsername || !expectedPassword) return false;
  return username === expectedUsername && password === expectedPassword;
}
