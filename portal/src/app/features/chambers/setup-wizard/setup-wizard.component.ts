import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ChamberService } from '../services/chamber.service';
import { AuthService } from '../../../core/auth/auth.service';

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

    // Auto-generate slug from name
    this.step1Form.get('name')?.valueChanges.subscribe(name => {
      if (name && !this.step1Form.get('slug')?.touched) {
        const slug = name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
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

  async submit() {
    this.isLoading = true;
    this.errorMessage = '';

    // Combine all form data
    const chamberData = {
      ...this.step1Form.value,
      ...this.step2Form.value,
      ...this.step3Form.value
    };

    this.chamberService.createChamber(chamberData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.data) {
          // Success - redirect to dashboard
          this.router.navigate(['/dashboard']);
        } else if (response.error) {
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
