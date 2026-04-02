import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Heart, MessageSquare, Gift, Mail, DollarSign, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  getRedemptionHistory,
  getNotificationHistory,
  getFeedbackList,
  getCampaigns,
  getCurrencies
} from '@/services/engagementService';

export default function EngagementDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.branch_id) return;
    loadEngagementData();
  }, [profile?.branch_id]);

  async function loadEngagementData() {
    try {
      setLoading(true);
      const [notif, feed, camps, curr] = await Promise.all([
        getNotificationHistory(undefined, profile?.branch_id || '', 50),
        getFeedbackList(profile?.branch_id || '', 20),
        getCampaigns(profile?.branch_id || ''),
        getCurrencies(profile?.branch_id || '')
      ]);

      setNotifications(notif || []);
      setFeedback(feed || []);
      setCampaigns(camps || []);
      setCurrencies(curr || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load engagement data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
    : 0;

  const positiveRatings = feedback.filter(f => f.sentiment === 'positive').length;
  const sentNotifications = notifications.filter(n => n.status === 'sent').length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Customer Engagement</h1>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">{avgRating}</div>
                <div className="text-muted-foreground">/5</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">From {feedback.length} reviews</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sentNotifications}</div>
              <p className="text-xs text-muted-foreground mt-1">Sent successfully</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeCampaigns}</div>
              <p className="text-xs text-muted-foreground mt-1">Running now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Currencies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{currencies.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Enabled</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="feedback" className="space-y-4">
          <TabsList>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Mail className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Gift className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="currency" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Currency
            </TabsTrigger>
          </TabsList>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Customer Feedback</span>
                  <Badge variant="secondary">{positiveRatings} positive</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedback.length > 0 ? (
                    feedback.map(f => (
                      <div key={f.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < f.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                          <Badge variant={f.sentiment === 'positive' ? 'default' : f.sentiment === 'neutral' ? 'secondary' : 'destructive'}>
                            {f.sentiment}
                          </Badge>
                        </div>
                        <p className="text-sm">{f.comment || 'No comment provided'}</p>
                        {f.response_from_management && (
                          <div className="mt-3 p-2 bg-muted rounded text-sm">
                            <p className="font-semibold mb-1">Management Response:</p>
                            <p>{f.response_from_management}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No feedback yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 10).map(n => (
                      <div key={n.id} className="border rounded-lg p-3 flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge>{n.notification_type}</Badge>
                            <Badge variant={n.status === 'sent' ? 'default' : 'secondary'}>
                              {n.status}
                            </Badge>
                          </div>
                          <p className="text-sm mt-2 truncate">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {n.sent_at ? new Date(n.sent_at).toLocaleDateString() : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No notifications</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaigns.length > 0 ? (
                    campaigns.slice(0, 10).map(c => (
                      <div key={c.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{c.name}</h4>
                            <p className="text-sm text-muted-foreground">{c.campaign_type}</p>
                          </div>
                          <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                            {c.status}
                          </Badge>
                        </div>
                        {c.discount_percentage && (
                          <p className="text-sm">
                            <span className="font-semibold">{c.discount_percentage}%</span> discount
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Recipients: {c.recipients_count} | Clicks: {c.click_count} | Redeemed: {c.redemption_count}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No campaigns</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Currency Tab */}
          <TabsContent value="currency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Currency Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currencies.length > 0 ? (
                    currencies.map(c => (
                      <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{c.currency_code}</h4>
                          <p className="text-sm text-muted-foreground">{c.currency_symbol}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">Rate: {c.exchange_rate.toFixed(6)}</p>
                          {c.is_primary && <Badge>Primary</Badge>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No currencies configured</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
