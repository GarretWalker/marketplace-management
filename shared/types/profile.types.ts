import { UserRole } from '../enums/user-role.enum';

export interface Profile {
  id: string;
  role: UserRole;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  chamberId?: string | null;
  merchantId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}
