import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ChamberService, ChamberMember, SyncStatus } from '../services/chamber.service';

@Component({
  selector: 'app-member-roster',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './member-roster.component.html',
  styleUrl: './member-roster.component.css'
})
export class MemberRosterComponent implements OnInit {
  private authService = inject(AuthService);
  private chamberService = inject(ChamberService);

  members: ChamberMember[] = [];
  syncStatus: SyncStatus | null = null;
  
  isLoading = true;
  isSyncing = false;
  searchQuery = '';
  filterStatus: 'all' | 'active' | 'inactive' | 'prospective' = 'all';
  filterClaimed: 'all' | 'claimed' | 'unclaimed' = 'all';

  currentPage = 1;
  pageSize = 50;
  totalMembers = 0;
  totalPages = 1;

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    const profile = this.authService.currentProfile;
    if (!profile?.chamber_id) {
      console.error('No chamber_id found in profile');
      return;
    }

    // Load sync status
    this.chamberService.getSyncStatus(profile.chamber_id).subscribe({
      next: (response) => {
        if (response.data) {
          this.syncStatus = response.data;
        }
      },
      error: (err) => console.error('Failed to load sync status:', err)
    });

    // Load members
    this.loadMembers();
  }

  loadMembers() {
    const profile = this.authService.currentProfile;
    if (!profile?.chamber_id) return;

    this.isLoading = true;

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.filterStatus !== 'all') {
      params.status = this.filterStatus;
    }

    if (this.filterClaimed !== 'all') {
      params.is_claimed = this.filterClaimed === 'claimed';
    }

    if (this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }

    this.chamberService.getMembers(profile.chamber_id, params).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.data) {
          this.members = response.data;
        }
        if (response.meta) {
          this.totalMembers = response.meta.total || 0;
          this.totalPages = response.meta.total_pages || 1;
          this.currentPage = response.meta.page || 1;
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load members:', err);
      }
    });
  }

  triggerSync() {
    const profile = this.authService.currentProfile;
    if (!profile?.chamber_id) return;

    this.isSyncing = true;
    console.log('Starting ChamberMaster sync...');

    this.chamberService.syncChamberMaster(profile.chamber_id).subscribe({
      next: (response) => {
        this.isSyncing = false;
        if (response.data?.success) {
          const result = response.data;
          console.log('✅ Sync completed successfully!', {
            membersAdded: result.membersAdded,
            membersUpdated: result.membersUpdated,
            membersDeactivated: result.membersDeactivated
          });
          console.log(`📊 Summary: Added ${result.membersAdded}, Updated ${result.membersUpdated}, Deactivated ${result.membersDeactivated}`);
          this.loadData(); // Reload both members and sync status
        } else {
          console.error('❌ Sync failed:', response.data?.errorMessage || 'Unknown error');
        }
      },
      error: (err) => {
        this.isSyncing = false;
        console.error('❌ Sync failed with error:', err);
        console.error('Check the network tab and server logs for more details.');
      }
    });
  }

  onSearchChange() {
    this.currentPage = 1;
    this.loadMembers();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadMembers();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadMembers();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadMembers();
    }
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  }
}
