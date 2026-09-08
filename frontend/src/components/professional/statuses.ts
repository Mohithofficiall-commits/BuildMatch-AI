export type StatusVariant = 'navy' | 'royal' | 'verified' | 'warning' | 'danger' | 'success';

export function requestStatus(status: string): { label: string; variant: StatusVariant } {
  switch (status) {
    case 'pending': return { label: 'PENDING', variant: 'warning' };
    case 'accepted': return { label: 'ACCEPTED', variant: 'royal' };
    case 'declined': return { label: 'DECLINED', variant: 'danger' };
    case 'completed': return { label: 'COMPLETED', variant: 'success' };
    case 'cancelled': return { label: 'CANCELLED', variant: 'navy' };
    default: return { label: status.toUpperCase().replace('_', ' '), variant: 'navy' };
  }
}

export function memberStatus(status: string): { label: string; variant: StatusVariant } {
  switch (status) {
    case 'invited': return { label: 'INVITED', variant: 'warning' };
    case 'active': return { label: 'ACTIVE', variant: 'success' };
    case 'completed': return { label: 'COMPLETED', variant: 'navy' };
    case 'declined': return { label: 'DECLINED', variant: 'danger' };
    default: return { label: status.toUpperCase(), variant: 'navy' };
  }
}

export function projectStatus(status: string): { label: string; variant: StatusVariant } {
  switch (status) {
    case 'active': return { label: 'ACTIVE', variant: 'royal' };
    case 'completed': return { label: 'COMPLETED', variant: 'success' };
    case 'planning': return { label: 'PLANNING', variant: 'navy' };
    case 'on_hold': return { label: 'ON HOLD', variant: 'warning' };
    default: return { label: status.toUpperCase().replace('_', ' '), variant: 'navy' };
  }
}

export function orderStatus(status: string): { label: string; variant: StatusVariant } {
  switch (status) {
    case 'pending': return { label: 'PENDING', variant: 'warning' };
    case 'confirmed': return { label: 'CONFIRMED', variant: 'royal' };
    case 'shipped': return { label: 'SHIPPED', variant: 'navy' };
    case 'delivered': return { label: 'DELIVERED', variant: 'success' };
    case 'cancelled': return { label: 'CANCELLED', variant: 'danger' };
    default: return { label: status.toUpperCase(), variant: 'navy' };
  }
}

export function availabilityStatus(status: string): { label: string; variant: StatusVariant } {
  switch (status) {
    case 'in_stock': return { label: 'In Stock', variant: 'success' };
    case 'low_stock': return { label: 'Low Stock', variant: 'warning' };
    case 'out_of_stock': return { label: 'Out of Stock', variant: 'danger' };
    default: return { label: status.replace('_', ' '), variant: 'navy' };
  }
}

export function verificationStatus(status: string): { label: string; variant: StatusVariant } {
  switch (status) {
    case 'verified': return { label: 'VERIFIED', variant: 'success' };
    case 'pending': return { label: 'PENDING', variant: 'warning' };
    case 'rejected': return { label: 'REJECTED', variant: 'danger' };
    default: return { label: status.toUpperCase(), variant: 'navy' };
  }
}

export function subscriptionStatus(status: string): { label: string; variant: StatusVariant } {
  switch (status) {
    case 'active': return { label: 'ACTIVE', variant: 'success' };
    case 'pending': return { label: 'PENDING PAYMENT', variant: 'warning' };
    case 'cancelled': return { label: 'CANCELLED', variant: 'danger' };
    case 'expired': return { label: 'EXPIRED', variant: 'navy' };
    default: return { label: status.toUpperCase(), variant: 'navy' };
  }
}
