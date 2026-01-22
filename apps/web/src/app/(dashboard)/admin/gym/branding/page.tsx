'use client';

import { useState, useEffect } from 'react';
import { Palette, Save, Loader2, ArrowLeft, ImageIcon, Globe, Instagram, Facebook, Link as LinkIcon } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

interface BrandingData {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  websiteUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
}

const DEFAULT_COLORS = {
  primary: '#6366f1',
  secondary: '#f1f5f9',
  accent: '#10b981',
};

export default function BrandingPage() {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tagline: '',
    description: '',
    logoUrl: '',
    coverImageUrl: '',
    primaryColor: DEFAULT_COLORS.primary,
    secondaryColor: DEFAULT_COLORS.secondary,
    accentColor: DEFAULT_COLORS.accent,
    websiteUrl: '',
    facebookUrl: '',
    instagramUrl: '',
  });

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/gym/branding');
      const data = await response.json();

      if (data.success && data.data) {
        setBranding(data.data);
        setFormData({
          tagline: data.data.tagline || '',
          description: data.data.description || '',
          logoUrl: data.data.logoUrl || '',
          coverImageUrl: data.data.coverImageUrl || '',
          primaryColor: data.data.primaryColor || DEFAULT_COLORS.primary,
          secondaryColor: data.data.secondaryColor || DEFAULT_COLORS.secondary,
          accentColor: data.data.accentColor || DEFAULT_COLORS.accent,
          websiteUrl: data.data.websiteUrl || '',
          facebookUrl: data.data.facebookUrl || '',
          instagramUrl: data.data.instagramUrl || '',
        });
      } else {
        setError(data.error?.message || 'Failed to load branding settings');
      }
    } catch {
      setError('Failed to load branding settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/gym/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagline: formData.tagline || null,
          description: formData.description || null,
          logoUrl: formData.logoUrl || null,
          coverImageUrl: formData.coverImageUrl || null,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          accentColor: formData.accentColor,
          websiteUrl: formData.websiteUrl || null,
          facebookUrl: formData.facebookUrl || null,
          instagramUrl: formData.instagramUrl || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBranding(data.data);
        setSuccessMessage('Branding settings saved successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error?.message || 'Failed to save branding settings');
      }
    } catch {
      setError('Failed to save branding settings');
    } finally {
      setIsSaving(false);
    }
  };

  const resetColors = () => {
    setFormData({
      ...formData,
      primaryColor: DEFAULT_COLORS.primary,
      secondaryColor: DEFAULT_COLORS.secondary,
      accentColor: DEFAULT_COLORS.accent,
    });
  };

  if (isLoading) {
    return (
      <>
        <Header title="Branding" description="Customize your gym's look and feel" />
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Branding" description="Customize your gym's look and feel" />

      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        {/* Back Link */}
        <Link
          href="/admin/gym"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Gym Settings
        </Link>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Brand Identity */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Palette className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Brand Identity</h2>
                <p className="text-sm text-slate-500">Your gym's name, tagline, and description</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">{branding?.name}</h3>
                <p className="text-sm text-slate-500">Your gym's logo will appear in the header</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="rounded-xl"
              />
              <p className="text-xs text-slate-500">Enter the URL of your logo image (recommended: 200x200px)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImageUrl">Cover Image URL</Label>
              <Input
                id="coverImageUrl"
                type="url"
                value={formData.coverImageUrl}
                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                placeholder="https://example.com/cover.jpg"
                className="rounded-xl"
              />
              <p className="text-xs text-slate-500">A hero image for your member portal (recommended: 1920x600px)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Your fitness journey starts here"
                maxLength={200}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell members about your gym..."
                rows={4}
                maxLength={2000}
                className="rounded-xl resize-none"
              />
              <p className="text-xs text-slate-500">{formData.description.length}/2000 characters</p>
            </div>
          </div>
        </div>

        {/* Theme Colors */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Theme Colors</h2>
                  <p className="text-sm text-slate-500">Customize your brand colors</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetColors}
                className="text-slate-500"
              >
                Reset to defaults
              </Button>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <div className="flex-1">
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="rounded-xl uppercase font-mono"
                      maxLength={7}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Used for buttons and primary actions</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="secondaryColor"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <div className="flex-1">
                    <Input
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="rounded-xl uppercase font-mono"
                      maxLength={7}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Used for backgrounds and cards</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="accentColor"
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <div className="flex-1">
                    <Input
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                      className="rounded-xl uppercase font-mono"
                      maxLength={7}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Used for success states and highlights</p>
              </div>
            </div>

            {/* Color Preview */}
            <div className="mt-6 p-4 rounded-xl border border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-3">Preview</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  Primary Button
                </button>
                <div
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: formData.secondaryColor }}
                >
                  Card Background
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: formData.accentColor }}
                >
                  Success Badge
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Social Links</h2>
                <p className="text-sm text-slate-500">Connect your social media profiles</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                Website
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                placeholder="https://www.yourgym.com"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-slate-400" />
                Facebook
              </Label>
              <Input
                id="facebookUrl"
                type="url"
                value={formData.facebookUrl}
                onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                placeholder="https://www.facebook.com/yourgym"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-slate-400" />
                Instagram
              </Label>
              <Input
                id="instagramUrl"
                value={formData.instagramUrl}
                onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                placeholder="@yourgym or https://instagram.com/yourgym"
                className="rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-slate-800 rounded-xl h-11 px-6"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
