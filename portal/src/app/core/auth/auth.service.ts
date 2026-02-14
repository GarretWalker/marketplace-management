import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, type SupabaseClient, type User, type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  chamber_id?: string;
  merchant_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentProfileSubject = new BehaviorSubject<UserProfile | null>(null);

  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  public currentProfile$: Observable<UserProfile | null> = this.currentProfileSubject.asObservable();

  constructor(private router: Router) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );

    // Initialize auth state
    this.initAuthState();
  }

  private async initAuthState() {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session?.user) {
      this.currentUserSubject.next(session.user);
      await this.loadUserProfile(session.user.id);
    }

    // Listen for auth changes
    // Only reload profile on sign in, sign out, or user updates (not on token refresh)
    this.supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      if (session?.user) {
        this.currentUserSubject.next(session.user);

        // Only load profile on relevant events, not on token refresh
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await this.loadUserProfile(session.user.id);
        }
      } else {
        this.currentUserSubject.next(null);
        this.currentProfileSubject.next(null);
      }
    });
  }

  private async loadUserProfile(userId: string) {
    console.log('🔵 Loading profile for user:', userId);

    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, role, chamber_id, merchant_id')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Failed to load profile:', error);

      // If profile doesn't exist or can't be loaded, clear the session
      // This handles cases where auth.users exists but profiles row doesn't
      console.warn('⚠️ Clearing invalid session - profile not found');
      await this.supabase.auth.signOut();
      this.currentUserSubject.next(null);
      this.currentProfileSubject.next(null);
      return;
    }

    if (data) {
      console.log('✅ Profile loaded:', data);
      const user = this.currentUserSubject.value;
      this.currentProfileSubject.next({
        id: data.id,
        email: user?.email || '',
        role: data.role,
        chamber_id: data.chamber_id,
        merchant_id: data.merchant_id
      });
    }
  }

  /**
   * Register a new chamber admin
   */
  async signUp(email: string, password: string): Promise<{ error: any }> {
    console.log('🔵 Starting signup for:', email);

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error('❌ Auth signup failed:', error);
      return { error };
    }

    if (data.user) {
      console.log('✅ Auth user created:', data.user.id);
      console.log('✅ Profile will be created automatically by database trigger');
    }

    return { error: null };
  }

  /**
   * Register a new merchant
   */
  async signUpMerchant(email: string, password: string): Promise<{ error: any }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });

    if (!error && data.user) {
      // Create profile with merchant role
      const { error: profileError } = await this.supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          role: 'merchant'
        });

      if (profileError) {
        return { error: profileError };
      }
    }

    return { error };
  }

  /**
   * Sign in existing user
   */
  async signIn(email: string, password: string): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    return { error };
  }

  /**
   * Sign out current user
   */
  async signOut() {
    await this.supabase.auth.signOut();
    this.router.navigate(['/login']);
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  /**
   * Get auth token for API calls
   */
  async getToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token || null;
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Get current user profile
   */
  get currentProfile(): UserProfile | null {
    return this.currentProfileSubject.value;
  }

  /**
   * Manually refresh the user profile from the database
   *
   * Use this after operations that update the profile table in the database
   * (e.g., chamber creation, which sets chamber_id).
   *
   * Why is this needed?
   * - The onAuthStateChange listener only reloads profile on SIGNED_IN or USER_UPDATED events
   * - Those events are triggered by auth.users table changes, not profiles table changes
   * - When the API updates the profiles table, the frontend's cached profile becomes stale
   * - This method forces a fresh fetch from the database to sync the in-memory profile
   */
  async refreshProfile(): Promise<void> {
    const user = this.currentUserSubject.value;
    if (user) {
      await this.loadUserProfile(user.id);
    }
  }
}
