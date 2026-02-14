import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ChamberService } from '../services/chamber.service';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Setup Wizard Component - 4-step onboarding flow for new chamber admins
 *
 * Steps:
 * 1. Chamber Information - name, location, contact details
 * 2. ChamberMaster Connection - optional API integration setup
 * 3. Branding - logo, colors, tagline
 * 4. Review & Submit - confirmation before creating chamber
 *
 * Features:
 * - Auto-generates URL slug from chamber name
 * - Step validation prevents advancing with invalid data
 * - Progress bar shows current step
 * - On completion, creates chamber and redirects to dashboard
 */
@Component({
  selector: 'app-setup-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './setup-wizard.component.html',
  styleUrl: './setup-wizard.component.css'
})
export class SetupWizardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private chamberService = inject(ChamberService);
  private authService = inject(AuthService);
  private router = inject(Router);

  currentStep = 1;
  totalSteps = 4;
  errorMessage = '';
  isLoading = false;

  // Form groups for each step
  step1Form!: FormGroup;
  step2Form!: FormGroup;
  step3Form!: FormGroup;

  ngOnInit() {
    // Step 1: Chamber Info
    this.step1Form = this.fb.group({
      name: ['', [Validators.required]],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required, Validators.maxLength(2)]],
      contact_email: ['', [Validators.required, Validators.email]],
      phone: [''],
      website_url: ['']
    });

    // Step 2: ChamberMaster Connection
    this.step2Form = this.fb.group({
      chambermaster_association_id: [''],
      chambermaster_api_key: [''],
      chambermaster_base_url: [''],
      chambermaster_sync_enabled: [false]
    });

    // Step 3: Branding
    this.step3Form = this.fb.group({
      tagline: [''],
      primary_color: ['#2563EB'],
      accent_color: ['#1E40AF'],
      logo_url: [''],
      hero_image_url: ['']
    });

    // Auto-generate URL-friendly slug from chamber name
    // Example: "Cullman Chamber of Commerce" → "cullman-chamber-of-commerce"
    // Only updates if user hasn't manually edited the slug field
    this.step1Form.get('name')?.valueChanges.subscribe(name => {
      if (name && !this.step1Form.get('slug')?.touched) {
        const slug = name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')  // Remove special characters
          .replace(/\s+/g, '-')          // Replace spaces with hyphens
          .replace(/-+/g, '-');          // Collapse multiple hyphens
        this.step1Form.patchValue({ slug }, { emitEvent: false });
      }
    });
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      if (this.isCurrentStepValid()) {
        this.currentStep++;
        this.errorMessage = '';
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.errorMessage = '';
    }
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.step1Form.valid;
      case 2:
        return this.step2Form.valid;
      case 3:
        return this.step3Form.valid;
      case 4:
        return true; // Review step
      default:
        return false;
    }
  }

  /**
   * Submit the complete chamber setup
   *
   * Combines data from all 4 steps and creates the chamber.
   * On success, the API also links this chamber to the current user's profile.
   * Refreshes the profile to get the updated chamber_id, then redirects to the dashboard.
   */
  async submit() {
    this.isLoading = true;
    this.errorMessage = '';

    // Merge all form data from the 4 steps into a single object
    const chamberData = {
      ...this.step1Form.value,
      ...this.step2Form.value,
      ...this.step3Form.value
    };

    this.chamberService.createChamber(chamberData).subscribe({
      next: async (response) => {
        if (response.data) {
          // Success - chamber created and linked to user profile
          // IMPORTANT: Refresh the profile to sync the updated chamber_id
          // The API updates the database, but our in-memory profile is stale.
          // Without this refresh, the dashboard will think we have no chamber and redirect back here.
          await this.authService.refreshProfile();
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        } else if (response.error) {
          this.isLoading = false;
          this.errorMessage = response.error.message;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to create chamber. Please try again.';
        console.error('Chamber creation error:', err);
      }
    });
  }

  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }
}
