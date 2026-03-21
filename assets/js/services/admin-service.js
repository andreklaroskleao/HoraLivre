export async function getAdminDashboardMetrics() {
  const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
  const billingSnapshot = await getDocs(collection(db, 'billingRecords'));

  let trialCount = 0;
  let activeCount = 0;
  let blockedCount = 0;
  let totalRevenue = 0;
  let totalCompleted = 0;

  tenantsSnapshot.forEach((docItem) => {
    const item = docItem.data();

    if (item.subscriptionStatus === 'trial') {
      trialCount += 1;
    }

    if (item.subscriptionStatus === 'active') {
      activeCount += 1;
    }

    if (item.subscriptionStatus === 'blocked' || item.isBlocked === true) {
      blockedCount += 1;
    }
  });

  billingSnapshot.forEach((docItem) => {
    const item = docItem.data();
    totalRevenue += Number(item.totalAmount || 0);
    totalCompleted += Number(item.completedAppointments || 0);
  });

  return {
    tenants: tenantsSnapshot.size,
    trial: trialCount,
    active: activeCount,
    blocked: blockedCount,
    completed: totalCompleted,
    revenue: totalRevenue
  };
}