import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ChamberService, Chamber } from '../services/chamber.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private chamberService = inject(ChamberService);
  private router = inject(Router);

  chamber: Chamber | null = null;
  isLoading = true;

  ngOnInit() {
    this.loadChamberData();
  }

  async loadChamberData() {
    const profile = this.authService.currentProfile;
    
    if (!profile?.chamber_id) {
      // No chamber associated, redirect to setup
      this.router.navigate(['/chambers/setup']);
      return;
    }

    this.chamberService.getChamber(profile.chamber_id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.data) {
          this.chamber = response.data;
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load chamber:', err);
      }
    });
  }

  async signOut() {
    await this.authService.signOut();
  }
}
