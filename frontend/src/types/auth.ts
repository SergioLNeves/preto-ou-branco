export interface User {
  id: string;
  username: string;
}

export interface AuthResult {
  token: string;
  user: User;
}
