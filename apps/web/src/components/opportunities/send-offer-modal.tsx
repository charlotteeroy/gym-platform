'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Phone,
  MessageSquare,
  Bell,
  Send,
  Sparkles,
  Calendar,
  User,
  DollarSign,
  Gift,
  TrendingUp,
  Zap,
  RefreshCw,
  Loader2,
  Check,
} from 'lucide-react';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

interface Opportunity {
  id: string;
  type: 'UPGRADE' | 'PERSONAL_TRAINING' | 'RENEWAL' | 'ADDON' | 'CROSS_SELL';
  status: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string | null;
  reason: string;
  potentialValue: number;
  recommendedAction: string;
  recommendedProduct: string | null;
  member: Member;
  targetPlan?: { id: string; name: string; priceAmount: number } | null;
  targetProduct?: { id: string; name: string; priceAmount: number } | null;
}

type Channel = 'email' | 'sms' | 'push';

interface SendOfferModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: {
    opportunityId: string;
    channel: Channel;
    message: string;
    followUpDate: string | null;
    subject?: string;
  }) => Promise<void>;
}

const channelOptions = [
  { id: 'email' as Channel, label: 'Email', icon: Mail, description: 'Send a detailed offer via email' },
  { id: 'sms' as Channel, label: 'SMS', icon: MessageSquare, description: 'Quick text message' },
  { id: 'push' as Channel, label: 'Push', icon: Bell, description: 'App notification' },
];

function generateSuggestedMessage(opportunity: Opportunity, channel: Channel): { subject: string; message: string } {
  const { member, type, recommendedProduct, targetPlan, potentialValue, reason } = opportunity;
  const firstName = member.firstName;

  const templates: Record<string, { subject: string; message: string }> = {
    UPGRADE: {
      subject: `${firstName}, you've earned a special upgrade offer!`,
      message: channel === 'email'
        ? `Hi ${firstName},

We've noticed you've been crushing your fitness goals lately - your dedication is inspiring! Based on your amazing attendance record, we think you'd love our ${targetPlan?.name || 'Premium'} membership.

Here's what you'll get:
- Unlimited class access
- Priority booking
- Exclusive member perks
- Personal training discounts

As a thank you for being such an active member, we're offering you an exclusive upgrade rate. Reply to this email or stop by the front desk to learn more!

Keep up the great work,
The Gym Team`
        : `Hey ${firstName}! You've been on fire lately! We'd love to upgrade you to ${targetPlan?.name || 'Premium'} with a special member discount. Interested? Reply YES for details!`,
    },
    PERSONAL_TRAINING: {
      subject: `${firstName}, ready to level up your training?`,
      message: channel === 'email'
        ? `Hi ${firstName},

You've been showing up consistently and we love to see it! Have you ever thought about taking your workouts to the next level with personal training?

Our certified trainers can help you:
- Break through plateaus
- Perfect your form
- Achieve faster results
- Stay accountable

We'd love to offer you a complimentary assessment session to see if PT is right for you. No pressure, just a chance to explore your goals!

Interested? Reply to this email or ask at the front desk.

Here's to your success,
The Gym Team`
        : `Hi ${firstName}! Your consistency is paying off! Want to accelerate your results? We're offering you a FREE personal training assessment. Reply YES to book!`,
    },
    RENEWAL: {
      subject: `${firstName}, let's keep your fitness journey going!`,
      message: channel === 'email'
        ? `Hi ${firstName},

We wanted to reach out because your membership is coming up for renewal soon, and we'd hate to see you go!

You've made incredible progress over the past year:
- Your commitment has been outstanding
- You've become part of our community
- Your fitness journey is just getting started

To show our appreciation, we'd like to offer you a special renewal rate. Lock in your membership now and continue building on everything you've achieved!

Let us know if you have any questions. We're here to support your goals.

See you at the gym,
The Gym Team`
        : `Hey ${firstName}! Your membership renewal is coming up. As a valued member, we have a special offer for you! Reply or stop by to hear about it.`,
    },
    ADDON: {
      subject: `${firstName}, we have something perfect for you!`,
      message: channel === 'email'
        ? `Hi ${firstName},

We've noticed you really enjoy our ${reason.includes('class') ? 'classes' : 'services'} - that's awesome!

Based on your preferences, we thought you might be interested in our ${recommendedProduct || 'class pack'}. It's perfect for members like you who love to stay active and try new things.

Benefits include:
- More flexibility
- Better value per session
- Priority access

Would you like to learn more? Just reply to this email or chat with us at your next visit!

Best,
The Gym Team`
        : `Hi ${firstName}! Loving your ${reason.includes('class') ? 'classes' : 'workout routine'}? We have a ${recommendedProduct || 'special offer'} that's perfect for you. Ask us about it!`,
    },
    CROSS_SELL: {
      subject: `${firstName}, discover more at the gym!`,
      message: channel === 'email'
        ? `Hi ${firstName},

Great to see you making the most of your membership! We wanted to let you know about some additional services that other members like you have found valuable.

Based on your fitness journey, you might enjoy:
- New class offerings
- Specialized programs
- Member-exclusive services

We'd love to tell you more about how these can enhance your experience. Drop us a reply or ask at your next visit!

Cheers,
The Gym Team`
        : `Hey ${firstName}! We have some exciting services to share with you based on your activity. Stop by or reply for more info!`,
    },
  };

  return templates[type] || templates.CROSS_SELL;
}

export function SendOfferModal({ opportunity, isOpen, onClose, onSend }: SendOfferModalProps) {
  const [channel, setChannel] = useState<Channel>('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (opportunity && isOpen) {
      const suggested = generateSuggestedMessage(opportunity, channel);
      setSubject(suggested.subject);
      setMessage(suggested.message);
      setSent(false);

      // Set default follow-up date to 3 days from now
      const defaultFollowUp = new Date();
      defaultFollowUp.setDate(defaultFollowUp.getDate() + 3);
      setFollowUpDate(defaultFollowUp.toISOString().split('T')[0]);
    }
  }, [opportunity, isOpen, channel]);

  const regenerateMessage = () => {
    if (opportunity) {
      const suggested = generateSuggestedMessage(opportunity, channel);
      setSubject(suggested.subject);
      setMessage(suggested.message);
    }
  };

  const handleSend = async () => {
    if (!opportunity) return;

    setIsSending(true);
    try {
      await onSend({
        opportunityId: opportunity.id,
        channel,
        message,
        followUpDate: followUpDate || null,
        subject: channel === 'email' ? subject : undefined,
      });
      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to send offer:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!opportunity) return null;

  const getTypeIcon = () => {
    switch (opportunity.type) {
      case 'UPGRADE': return <TrendingUp className="h-5 w-5" />;
      case 'PERSONAL_TRAINING': return <Zap className="h-5 w-5" />;
      case 'RENEWAL': return <RefreshCw className="h-5 w-5" />;
      case 'ADDON': return <Gift className="h-5 w-5" />;
      default: return <Sparkles className="h-5 w-5" />;
    }
  };

  const getTypeColor = () => {
    switch (opportunity.type) {
      case 'UPGRADE': return 'bg-indigo-100 text-indigo-600';
      case 'PERSONAL_TRAINING': return 'bg-amber-100 text-amber-600';
      case 'RENEWAL': return 'bg-emerald-100 text-emerald-600';
      case 'ADDON': return 'bg-purple-100 text-purple-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-indigo-600" />
            Send Personalized Offer
          </DialogTitle>
          <DialogDescription>
            Create and send a tailored offer to this member
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Offer Sent!</h3>
            <p className="text-sm text-slate-500">
              Your message has been sent to {opportunity.member.firstName}
            </p>
          </div>
        ) : (
          <>
            {/* Member Info Card */}
            <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {(opportunity.member.firstName?.[0] ?? '').toUpperCase()}{(opportunity.member.lastName?.[0] ?? '').toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  {opportunity.member.firstName} {opportunity.member.lastName}
                </h3>
                <p className="text-sm text-slate-500">{opportunity.member.email}</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${getTypeColor()}`}>
                  {getTypeIcon()}
                  {opportunity.title}
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-semibold mt-1">
                  <DollarSign className="h-4 w-4" />
                  {Number(opportunity.potentialValue).toLocaleString()} potential
                </div>
              </div>
            </div>

            {/* AI Suggestion Banner */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 mb-1">AI Suggestion</h4>
                  <p className="text-sm text-slate-600">{opportunity.recommendedAction}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-medium">Why this member:</span> {opportunity.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Channel Selection */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-3 block">
                Choose Channel
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {channelOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setChannel(option.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        channel === option.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                        channel === option.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className={`font-medium ${channel === option.id ? 'text-indigo-900' : 'text-slate-900'}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject (Email only) */}
            {channel === 'email' && (
              <div>
                <Label htmlFor="subject" className="text-sm font-medium text-slate-700 mb-2 block">
                  Subject Line
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="rounded-xl"
                />
              </div>
            )}

            {/* Message */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="message" className="text-sm font-medium text-slate-700">
                  Message
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={regenerateMessage}
                  className="text-indigo-600 hover:text-indigo-700 gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </Button>
              </div>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your personalized message..."
                className="rounded-xl min-h-[180px] resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">
                {message.length} characters
                {channel === 'sms' && message.length > 160 && (
                  <span className="text-amber-600 ml-2">
                    (Will be sent as {Math.ceil(message.length / 160)} messages)
                  </span>
                )}
              </p>
            </div>

            {/* Follow-up Date */}
            <div>
              <Label htmlFor="followup" className="text-sm font-medium text-slate-700 mb-2 block">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule Follow-up
                </div>
              </Label>
              <Input
                id="followup"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="rounded-xl w-auto"
              />
              <p className="text-xs text-slate-500 mt-1">
                We'll remind you to follow up on this opportunity
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !message.trim()}
                className="rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send {channel === 'email' ? 'Email' : channel === 'sms' ? 'SMS' : 'Notification'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
