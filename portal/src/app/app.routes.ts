import { Routes } from '@angular/router';
import { RegisterComponent } from './features/auth/register/register.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterMerchantComponent } from './features/auth/register-merchant/register-merchant.component';
import { SetupWizardComponent } from './features/chambers/setup-wizard/setup-wizard.component';
import { DashboardComponent } from './features/chambers/dashboard/dashboard.component';
import { MemberRosterComponent } from './features/chambers/member-roster/member-roster.component';
import { MerchantOnboardingComponent } from './features/merchants/onboarding/onboarding.component';
import { MerchantDashboardComponent } from './features/merchants/dashboard/dashboard.component';
import { ClaimWizardComponent } from './features/claims/wizard/claim-wizard.component';
import { ClaimsAdminComponent } from './features/claims/admin/claims-admin.component';
import { ProductListComponent } from './features/products/components/product-list/product-list.component';
import { ProductFormComponent } from './features/products/components/product-form/product-form.component';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  
  // Merchant Routes
  { path: 'merchant/register', component: RegisterMerchantComponent },
  { path: 'merchant/onboarding', component: MerchantOnboardingComponent },
  { path: 'merchant/dashboard', component: MerchantDashboardComponent, canActivate: [authGuard] },
  { path: 'merchant/products', component: ProductListComponent, canActivate: [roleGuard('merchant')] },
  { path: 'merchant/products/new', component: ProductFormComponent, canActivate: [roleGuard('merchant')] },
  { path: 'merchant/products/:id/edit', component: ProductFormComponent, canActivate: [roleGuard('merchant')] },
  
  // Claims Routes
  { path: 'claims/wizard', component: ClaimWizardComponent, canActivate: [authGuard] },
  { path: 'claims/manage', component: ClaimsAdminComponent, canActivate: [roleGuard('chamber_admin')] },
  
  // Chamber Routes
  { path: 'chambers/setup', component: SetupWizardComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'chambers/members', component: MemberRosterComponent, canActivate: [authGuard] },
  
  { path: '**', redirectTo: '/login' }
];
