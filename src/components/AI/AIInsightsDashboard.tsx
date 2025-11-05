import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAIInsights } from '@/hooks/useAIInsights';
import { StandardEventSelector } from '../Dashboard/StandardEventSelector';
import { useState } from 'react';
import { TrendingUp, Users, AlertTriangle, Sparkles, RefreshCw, Send, ChefHat } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';

export const AIInsightsDashboard = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { insights, loading, refresh } = useAIInsights(selectedEventId);
  const { events, loading: eventsLoading } = useEvents();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered analytics and recommendations
          </p>
        </div>
        {insights && (
          <Button onClick={refresh} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <StandardEventSelector
            events={events}
            selectedEventId={selectedEventId}
            onEventSelect={setSelectedEventId}
            loading={eventsLoading}
          />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-lg">Generating AI insights...</span>
        </div>
      ) : insights ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Response Rate</p>
                    <p className="text-2xl font-bold">{insights.metrics.response_rate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Attendance</p>
                    <p className="text-2xl font-bold">{insights.insights.predicted_attendance}</p>
                    <p className="text-xs text-muted-foreground">
                      ({insights.insights.confidence_level} confidence)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending RSVPs</p>
                    <p className="text-2xl font-bold">{insights.metrics.pending}</p>
                    <p className="text-xs text-muted-foreground">
                      {insights.metrics.days_until_event} days until event
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <ChefHat className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Special Dietary</p>
                    <p className="text-2xl font-bold">
                      {Object.keys(insights.metrics.dietary_breakdown).length}
                    </p>
                    <p className="text-xs text-muted-foreground">different requirements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Insights & Recommendations
              </CardTitle>
              <CardDescription>
                Powered by AI analysis of your event data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.insights.risk_alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    alert.severity === 'warning'
                      ? 'border-orange-200 bg-orange-50'
                      : alert.severity === 'success'
                      ? 'border-green-200 bg-green-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            alert.severity === 'warning'
                              ? 'destructive'
                              : alert.severity === 'success'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {alert.severity}
                        </Badge>
                        <h3 className="font-semibold">{alert.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>
                      {alert.action && (
                        <Button size="sm" variant="outline">
                          <Send className="w-3 h-3 mr-2" />
                          {alert.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {insights.insights.cost_suggestions && insights.insights.cost_suggestions.length > 0 && (
                <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    💰 Cost Optimization Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {insights.insights.cost_suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-purple-600">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          {insights.insights.timeline_milestones && (
            <Card>
              <CardHeader>
                <CardTitle>⏰ Recommended Timeline</CardTitle>
                <CardDescription>AI-suggested milestones for your event</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.insights.timeline_milestones.map((milestone, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {milestone.days_from_now === 0
                            ? 'NOW'
                            : `${milestone.days_from_now}d`}
                        </div>
                        {index < insights.insights.timeline_milestones!.length - 1 && (
                          <div className="w-0.5 h-full bg-border flex-1 my-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <h4 className="font-semibold">{milestone.title}</h4>
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">Select an event to view AI insights</p>
              <p className="text-sm">Choose an event above to generate intelligent recommendations</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};