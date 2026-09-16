self.addEventListener('push', (event) => {
  const fallback = { title: 'Ipapo Broadcast', body: 'A new community update is available.', url: '/news.html' };
  let data = fallback;

  try {
    data = event.data ? { ...fallback, ...event.data.json() } : fallback;
  } catch (error) {
    data = fallback;
  }

  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/img/ipapo_gateway.jpg',
    badge: '/img/ipapo_gateway.jpg',
    tag: data.tag || 'ipapo-broadcast-news',
    data: { url: data.url }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url;
  if (!target) return;

  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => 'focus' in client);
    if (existing) {
      existing.navigate(target);
      return existing.focus();
    }
    return clients.openWindow(target);
  }));
});
