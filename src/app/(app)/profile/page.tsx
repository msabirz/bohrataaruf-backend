'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Pencil, Eye, EyeOff, ShieldCheck, GraduationCap, Briefcase, MapPin, Home,
  Users, Baby, Sparkles, Heart, Camera,
} from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { FamilySection } from '@/components/ui/FamilySection';
import { ChildrenSection } from '@/components/ui/ChildrenSection';
import { PhotoPrivacyPicker, type PhotoPrivacyMode } from '@/components/ui/PhotoPrivacyPicker';
import { ImageUploadWithCrop } from '@/components/ui/ImageUploadWithCrop';
import { VerificationStatusCard } from '@/components/app/VerificationStatusCard';
import { LifestyleIcon } from '@/lib/lifestyleIcons';
import { LifestyleToggle, type TraitPair } from '@/components/app/LifestyleToggle';
import { WebRangeSlider } from '@/components/app/WebRangeSlider';
import { AGE_MIN, AGE_MAX } from '@/components/app/FilterPanel';
import { HEIGHT_PICKER_OPTIONS, DEFAULT_HEIGHT_CM, nearestHeightOptionCm } from '@/lib/height';

// Same lists used on the edit page (profile/page.tsx) and signup — kept as
// their own literal copies here rather than a shared constants module,
// matching how this project already duplicates these small option lists
// per-page (see signup/page.tsx's own EDUCATION_OPTIONS/PROFESSION_OPTIONS).
const OWN_EDUCATION_OPTIONS = ['High School', 'B.Com', 'B.Tech', 'MBBS', 'BDS', 'MBA', 'CA', 'M.Ed', 'PhD', 'Other'];
const OWN_PROFESSION_OPTIONS = ['Doctor', 'Engineer', 'Teacher', 'Business', 'CA', 'Dentist', 'Lawyer', 'Homemaker', 'Other'];
const PREF_CITIES = ['Any', 'Mumbai', 'Pune', 'Surat', 'Dubai', 'Karachi', 'London', 'New York'];
const PREF_EDUCATION = ['Any', 'Bachelors', 'Masters', 'PhD', 'Diploma', 'High School'];
const PREF_PROFESSIONS = ['Any', 'Engineer', 'Doctor', 'Business', 'Design', 'Lawyer', 'Finance', 'Teaching', 'Other'];
const PRACTICE_LEVELS = [
  { value: 'very_devout', label: 'Very Devout' }, { value: 'practicing', label: 'Practicing' },
  { value: 'moderate', label: 'Moderate' }, { value: 'flexible', label: 'Flexible' },
];
const FAMILY_EXPECTATIONS = [
  { value: 'very_important', label: 'Very Important' }, { value: 'somewhat', label: 'Somewhat' },
  { value: 'flexible', label: 'Flexible' }, { value: 'not_sure', label: 'Not sure' },
];
const QUALITY_TAGS = ['Ambitious', 'Family-oriented', 'Creative', 'Religious', 'Athletic', 'Traveler'];
const MARITAL_STATUSES = [
  { value: 'never_married', label: 'Never Married' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' },
];
const LANGUAGE_OPTIONS = [{ value: 'en', label: 'English' }, { value: 'gu', label: 'Gujarati' }, { value: 'ur', label: 'Urdu' }];
const RELOCATE_OPTIONS = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'depends', label: 'Depends' }];
const CHILDREN_ACCEPTANCE_OPTIONS = [{ value: 'yes', label: 'Yes' }, { value: 'open', label: 'Open' }, { value: 'prefer_not', label: 'Prefer not' }];

type ModalKey = 'about' | 'family' | 'preferences' | 'lifestyle' | 'privacy' | 'photo' | null;

function labelize(v: string | null | undefined) {
  if (!v) return '';
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const inputCls = 'w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background';

export default function ProfileViewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [openModal, setOpenModal] = useState<ModalKey>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Read-only / identity
  const [alias, setAlias] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | undefined>(undefined);
  const [completionPercentage, setCompletionPercentage] = useState<number | null>(null);

  // Basics
  const [name, setName] = useState('');
  const [gender, setGender] = useState('female');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [jamaat, setJamaat] = useState('');
  const [email, setEmail] = useState('');
  const [education, setEducation] = useState('');
  const [educationOther, setEducationOther] = useState('');
  const [profession, setProfession] = useState('');
  const [professionOther, setProfessionOther] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [bio, setBio] = useState('');
  const [introLine, setIntroLine] = useState('');

  // Family background
  const [heightCm, setHeightCm] = useState<number>(DEFAULT_HEIGHT_CM);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [willingToRelocate, setWillingToRelocate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [brothersCount, setBrothersCount] = useState<number | null>(null);
  const [brothersMarriedCount, setBrothersMarriedCount] = useState<number | null>(null);
  const [sistersCount, setSistersCount] = useState<number | null>(null);
  const [sistersMarriedCount, setSistersMarriedCount] = useState<number | null>(null);
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [childrenCount, setChildrenCount] = useState<number | null>(null);
  const [childrenBoysCount, setChildrenBoysCount] = useState<number | null>(null);
  const [childrenGirlsCount, setChildrenGirlsCount] = useState<number | null>(null);
  const [childrenLivingStatus, setChildrenLivingStatus] = useState<string | null>(null);

  // Partner preferences
  const [ageRange, setAgeRange] = useState<[number, number]>([AGE_MIN, AGE_MAX]);
  const [prefCities, setPrefCities] = useState<string[]>([]);
  const [prefEducation, setPrefEducation] = useState<string[]>([]);
  const [prefProfessions, setPrefProfessions] = useState<string[]>([]);
  const [practiceLevel, setPracticeLevel] = useState('');
  const [familyExpectation, setFamilyExpectation] = useState('');
  const [partnerQualityTags, setPartnerQualityTags] = useState<string[]>([]);
  const [childrenAcceptance, setChildrenAcceptance] = useState('');

  // Lifestyle
  const [traitPairs, setTraitPairs] = useState<TraitPair[]>([]);
  const [lifestyleAnswers, setLifestyleAnswers] = useState<Record<string, string>>({});

  // Photo privacy
  const [photoPrivacyMode, setPhotoPrivacyMode] = useState<PhotoPrivacyMode>('three_then_request');
  const [photoAllowedModes, setPhotoAllowedModes] = useState<PhotoPrivacyMode[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState('');

  const isSelected = (arr: string[], val: string) => arr.some((i) => i.toLowerCase() === val.toLowerCase());
  const toggleArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => (isSelected(prev, item) ? prev.filter((i) => i.toLowerCase() !== item.toLowerCase()) : [...prev, item]));
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/v1/profile').then((r) => r.json()).then((data) => {
      if (!mounted) return;
      setAlias(data.alias || '');
      setAge(data.age ?? null);
      setPhotoUri(data.photoUri || null);
      setVerificationStatus(data.verification?.status);
      setName(data.name || '');
      setGender(data.gender || 'female');
      setDob(data.dob ? data.dob.split('T')[0] : '');
      setCity(data.city || '');
      setJamaat(data.jamaat || '');
      setEmail(data.email || '');
      if (data.education) {
        const known = OWN_EDUCATION_OPTIONS.includes(data.education);
        setEducation(known ? data.education : 'Other');
        setEducationOther(known ? '' : data.education);
      }
      if (data.profession) {
        const known = OWN_PROFESSION_OPTIONS.includes(data.profession);
        setProfession(known ? data.profession : 'Other');
        setProfessionOther(known ? '' : data.profession);
      }
      setFieldOfStudy(data.fieldOfStudy || '');
      setBio(data.bio || '');
      setIntroLine(data.introLine || '');
      setHeightCm(data.heightCm != null ? nearestHeightOptionCm(data.heightCm) : DEFAULT_HEIGHT_CM);
      setPreferredLanguage(data.preferredLanguage || 'en');
      setWillingToRelocate(data.willingToRelocate || '');
      setMaritalStatus(data.maritalStatus || '');
      setBrothersCount(data.brothersCount ?? null);
      setBrothersMarriedCount(data.brothersMarriedCount ?? null);
      setSistersCount(data.sistersCount ?? null);
      setSistersMarriedCount(data.sistersMarriedCount ?? null);
      setHasChildren(data.hasChildren ?? null);
      setChildrenCount(data.childrenCount ?? null);
      setChildrenBoysCount(data.childrenBoysCount ?? null);
      setChildrenGirlsCount(data.childrenGirlsCount ?? null);
      setChildrenLivingStatus(data.childrenLivingStatus ?? null);
      setPhotoPrivacyMode(data.photoPrivacyMode || 'three_then_request');
      if (data.lifestyleAnswers) setLifestyleAnswers(data.lifestyleAnswers);
      if (data.preferences) {
        setAgeRange([data.preferences.ageRange?.min ?? AGE_MIN, data.preferences.ageRange?.max ?? AGE_MAX]);
        setPrefCities(data.preferences.cities || []);
        setPrefEducation(data.preferences.education || []);
        setPrefProfessions(data.preferences.professions || []);
        setPracticeLevel(data.preferences.practiceLevel || '');
        setFamilyExpectation(data.preferences.familyExpectation || '');
        setPartnerQualityTags(data.preferences.partnerQualityTags || []);
        setChildrenAcceptance(data.preferences.childrenAcceptance || '');
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));

    fetch('/api/v1/profile/completion').then((r) => r.json()).then((d) => {
      if (mounted && typeof d.percentage === 'number') setCompletionPercentage(d.percentage);
    }).catch(() => {});

    fetch('/api/v1/lifestyle-traits').then((r) => r.json()).then((d) => {
      if (mounted) setTraitPairs(d.pairs || []);
    }).catch(() => {});

    fetch('/api/v1/profile/photo-privacy-options').then((r) => r.json()).then((d) => {
      if (mounted && d.allowedModes) setPhotoAllowedModes(d.allowedModes);
    }).catch(() => {});

    return () => { mounted = false; };
  }, []);

  const saveBasics = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const dobForApi = dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)
        ? (() => { const [y, m, d] = dob.split('-'); return `${d}/${m}/${y}`; })()
        : dob;
      const res1 = await fetch('/api/v1/profile/basics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, gender, dob: dobForApi, city, jamaat, email,
          education: education === 'Other' ? educationOther.trim() : (education || undefined),
          profession: profession === 'Other' ? professionOther.trim() : (profession || undefined),
          fieldOfStudy: fieldOfStudy || undefined,
          heightCm, preferredLanguage,
          willingToRelocate: willingToRelocate || undefined,
          maritalStatus: maritalStatus || undefined,
          brothersCount: brothersCount ?? undefined,
          brothersMarriedCount: brothersMarriedCount ?? undefined,
          sistersCount: sistersCount ?? undefined,
          sistersMarriedCount: sistersMarriedCount ?? undefined,
          hasChildren: hasChildren ?? undefined,
          childrenCount: childrenCount ?? undefined,
          childrenBoysCount: childrenBoysCount ?? undefined,
          childrenGirlsCount: childrenGirlsCount ?? undefined,
          childrenLivingStatus: childrenLivingStatus ?? undefined,
        }),
      });
      const res2 = await fetch('/api/v1/profile/bio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, introLine }),
      });
      if (!res1.ok || !res2.ok) throw new Error();
      setMessage('Saved.');
      setOpenModal(null);
      fetch('/api/v1/profile/completion').then((r) => r.json()).then((d) => {
        if (typeof d.percentage === 'number') setCompletionPercentage(d.percentage);
      }).catch(() => {});
    } catch {
      setMessage('Something went wrong — please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/v1/profile/preferences', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ageRange: { min: ageRange[0], max: ageRange[1] },
          cities: prefCities, education: prefEducation, professions: prefProfessions,
          practiceLevel: practiceLevel || undefined, familyExpectation: familyExpectation || undefined,
          partnerQualityTags, childrenAcceptance: childrenAcceptance || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setMessage('Saved.');
      setOpenModal(null);
    } catch {
      setMessage('Something went wrong — please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const savePhotoPrivacy = async (mode: PhotoPrivacyMode) => {
    const prev = photoPrivacyMode;
    setPhotoPrivacyMode(mode);
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoPrivacyMode: mode }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPhotoPrivacyMode(prev);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setIsUploadingPhoto(true);
    setPhotoUploadError('');
    try {
      // Same upload-url → PUT → confirm flow used at signup.
      const urlRes = await fetch('/api/v1/profile/photo/upload-url', { method: 'POST' });
      if (!urlRes.ok) throw new Error();
      const { uploadUrl, objectKey } = await urlRes.json();
      const putRes = await fetch(uploadUrl, { method: 'PUT', body: file });
      if (!putRes.ok) throw new Error();
      const confirmRes = await fetch('/api/v1/profile/photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoKey: objectKey }),
      });
      if (!confirmRes.ok) throw new Error();
      const data = await confirmRes.json().catch(() => null);
      // Prefer whatever URL the API hands back; fall back to the local
      // object preview so the avatar updates instantly either way.
      setPhotoUri(data?.photoUri || URL.createObjectURL(file));
      setOpenModal(null);
      fetch('/api/v1/profile/completion').then((r) => r.json()).then((d) => {
        if (typeof d.percentage === 'number') setCompletionPercentage(d.percentage);
      }).catch(() => {});
    } catch {
      setPhotoUploadError('Upload failed — please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLifestyleChange = async (slug: string, optionKey: string) => {
    const prev = lifestyleAnswers;
    const next = { ...lifestyleAnswers, [slug]: optionKey };
    setLifestyleAnswers(next);
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifestyleAnswers: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLifestyleAnswers(prev);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const siblingsLine = (() => {
    const parts: string[] = [];
    if (brothersCount != null) parts.push(`${brothersCount} brother${brothersCount === 1 ? '' : 's'}${brothersMarriedCount ? ` (${brothersMarriedCount} married)` : ''}`);
    if (sistersCount != null) parts.push(`${sistersCount} sister${sistersCount === 1 ? '' : 's'}${sistersMarriedCount ? ` (${sistersMarriedCount} married)` : ''}`);
    return parts.length ? parts.join(' · ') : 'Not shared';
  })();

  const heightLabel = HEIGHT_PICKER_OPTIONS.find((o) => o.cm === heightCm)?.label || `${heightCm} cm`;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* max-w-[920px] to match the approved design mockup's .shell width
          exactly — max-w-3xl (768px) was reading narrower side-by-side. */}
      <div className="container mx-auto max-w-[920px] px-6 pt-8">

        {/* Mode switch + link back to the full edit page */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <Link href="/profile/edit" className="text-sm font-semibold text-muted hover:text-foreground transition-colors">
            ← Back to edit
          </Link>
          <div className="inline-flex bg-surface border border-border rounded-full p-1 shadow-sm">
            <button
              onClick={() => setIsGuest(false)}
              className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${!isGuest ? 'bg-primary text-surface' : 'text-muted'}`}
            >
              <Pencil className="w-3.5 h-3.5" /> Editing my profile
            </button>
            <button
              onClick={() => setIsGuest(true)}
              className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${isGuest ? 'bg-primary text-surface' : 'text-muted'}`}
            >
              <Eye className="w-3.5 h-3.5" /> Preview as guest
            </button>
          </div>
        </div>

        {isGuest && (
          <div className="flex items-center gap-2.5 bg-accent-light border border-accent text-primary text-sm font-semibold px-4 py-3 rounded-xl mb-5">
            <EyeOff className="w-4 h-4 shrink-0" />
            Roughly what a match sees before you're mutually connected — your real name, editing tools, and a few owner-only details are hidden.
          </div>
        )}

        {message && <div className="bg-primary/10 text-primary text-sm font-medium px-4 py-3 rounded-xl mb-5">{message}</div>}

        {/* Hero */}
        <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm mb-5">
          <div className="relative h-28" style={{ background: 'linear-gradient(120deg, #8C6A3F 0%, #C9A96E 100%)' }}>
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 112" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="hero-arches" width="80" height="112" patternUnits="userSpaceOnUse">
                  <path d="M0 112V56a40 40 0 0 1 80 0v56" fill="none" stroke="#FFFFFC" strokeWidth="2" />
                </pattern>
              </defs>
              <rect width="800" height="112" fill="url(#hero-arches)" />
            </svg>
          </div>
          <div className="px-7 pb-6">
            <div className="flex items-end gap-4">
              <div className="relative -mt-11 w-24 h-24 shrink-0">
                <div className="w-24 h-24 rounded-full border-4 border-surface bg-accent-light overflow-hidden shadow-sm">
                  {photoUri ? (
                    <img
                      src={photoUri} alt="" className="w-full h-full object-cover"
                      style={isGuest ? { filter: 'blur(11px) saturate(0.9)', transform: 'scale(1.1)' } : undefined}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-primary text-2xl" style={{ fontFamily: 'Georgia, serif' }}>
                      {alias.slice(0, 2).toUpperCase() || '··'}
                    </div>
                  )}
                </div>
                {!isGuest && (
                  <>
                    <button
                      onClick={() => setOpenModal('privacy')}
                      className="absolute -left-1 -bottom-1 w-7 h-7 rounded-full bg-primary text-surface border-2 border-surface flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
                      title="Photo privacy"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setPhotoUploadError(''); setOpenModal('photo'); }}
                      className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-surface text-primary border-2 border-surface shadow-sm flex items-center justify-center hover:scale-105 transition-transform"
                      title="Update profile photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Profile strength now sits beside the avatar instead of as
                  a separate full-width row under the divider below. */}
              {!isGuest && completionPercentage != null && (
                <div className="flex-1 pb-1.5 min-w-[140px]">
                  <div className="h-1.5 rounded-full bg-border overflow-hidden mb-1.5">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-primary" style={{ width: `${completionPercentage}%` }} />
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">Profile strength — <b className="text-primary">{completionPercentage}%</b></span>
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-4 mt-3 flex-wrap">
              <div>
                {/* Real name is owner-only — a guest must never see it, that's
                    the whole point of the alias system, so it only renders
                    as the heading when !isGuest. When it's hidden (or not
                    set yet), the alias itself becomes the heading instead
                    of leaving a blank line above it. */}
                {!isGuest && name ? (
                  <>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
                      {name}
                      {verificationStatus === 'verified' && <VerifiedBadge />}
                    </h1>
                    <p className="text-xs uppercase tracking-wide text-muted font-bold mt-1">Alias · <span className="normal-case font-semibold text-foreground">{alias}</span></p>
                  </>
                ) : (
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
                    {alias}
                    {verificationStatus === 'verified' && <ShieldCheck className="w-5 h-5 text-accent" />}
                  </h1>
                )}
                {introLine && !isGuest && <p className="text-foreground mt-1.5 max-w-md">{introLine}</p>}
                <p className="text-sm text-muted mt-2 flex items-center gap-1.5 flex-wrap">
                  <MapPin className="w-3.5 h-3.5" />
                  {city || 'City not set'}
                  {jamaat && <><span className="opacity-50">·</span>{jamaat} Jamaat</>}
                  {age != null && <><span className="opacity-50">·</span>{age} yrs</>}
                  {!isGuest && <><span className="opacity-50">·</span>{heightLabel}</>}
                </p>
                {traitPairs.length > 0 && Object.keys(lifestyleAnswers).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {traitPairs.filter((p) => lifestyleAnswers[p.slug]).map((p) => {
                      const val = lifestyleAnswers[p.slug];
                      const isLeft = val === p.leftOptionKey;
                      const label = isLeft ? p.leftOptionLabel : p.rightOptionLabel;
                      const iconName = isLeft ? p.leftIconWeb : p.rightIconWeb;
                      return (
                        <span key={p.id} className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-accent-light border border-accent text-xs font-bold text-primary">
                          <LifestyleIcon name={iconName} className="w-3 h-3" />
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {!isGuest && (
                <button
                  onClick={() => setOpenModal('about')}
                  className="inline-flex items-center gap-2 text-sm font-semibold border border-border hover:border-accent px-4 py-2 rounded-xl transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit intro
                </button>
              )}
            </div>

          </div>
        </div>

        <div className="space-y-5">

          {/* About */}
          <Card title="About" icon={<Sparkles className="w-4 h-4" />} onEdit={!isGuest ? () => setOpenModal('about') : undefined}>
            {bio ? <p className="text-sm leading-relaxed text-foreground">{bio}</p> : <p className="text-sm text-muted italic">No bio yet.</p>}
          </Card>

          {/* Basic details */}
          <Card title="Basic Details" icon={<GraduationCap className="w-4 h-4" />} onEdit={!isGuest ? () => setOpenModal('about') : undefined}>
            {(() => {
              const educationValue = education === 'Other' ? educationOther : education;
              const professionValue = profession === 'Other' ? professionOther : profession;
              const hasAnything = educationValue || professionValue || fieldOfStudy || (!isGuest && (heightLabel || preferredLanguage || email));
              if (!hasAnything) return <p className="text-sm text-muted italic">Nothing shared here yet.</p>;
              return (
                <dl className="grid grid-cols-2 gap-4">
                  <KV icon={<GraduationCap className="w-4 h-4" />} label="Education" value={educationValue} />
                  <KV icon={<Briefcase className="w-4 h-4" />} label="Profession" value={professionValue} />
                  <KV label="Field of study" value={fieldOfStudy} />
                  {!isGuest && <KV label="Height" value={heightLabel} />}
                  {!isGuest && <KV label="Preferred language" value={LANGUAGE_OPTIONS.find((o) => o.value === preferredLanguage)?.label} />}
                  {!isGuest && <KV label="Recovery email" value={email} />}
                </dl>
              );
            })()}
          </Card>

          {/* Family background */}
          <Card title="Family Background" icon={<Users className="w-4 h-4" />} onEdit={!isGuest ? () => setOpenModal('family') : undefined}>
            <dl className="space-y-3">
              <KVRow label="Marital status" value={labelize(maritalStatus) || 'Not shared'} />
              {!isGuest && <KVRow label="Willing to relocate" value={labelize(willingToRelocate) || 'Not shared'} />}
              {!isGuest && <KVRow label="Siblings" value={siblingsLine} />}
              {hasChildren != null && (
                <KVRow
                  icon={<Baby className="w-4 h-4" />}
                  label="Children"
                  value={hasChildren ? `${childrenCount ?? '—'} ${childrenCount === 1 ? 'child' : 'children'}${childrenLivingStatus ? ` · ${labelize(childrenLivingStatus)}` : ''}` : 'None'}
                />
              )}
            </dl>
          </Card>

          {/* Partner preferences — owner sees the full set they've set (not
              just a truncated preview); guests only ever get the narrow
              practiceLevel/familyExpectation subset below, matching what
              ProfileDetailModal actually exposes to a real viewer. */}
          {!isGuest && (
            <Card title="Partner Preferences" icon={<Heart className="w-4 h-4" />} onEdit={() => setOpenModal('preferences')}>
              {(() => {
                const hasRangeOnly = ageRange[0] === AGE_MIN && ageRange[1] === AGE_MAX;
                const hasAnything = !hasRangeOnly || prefCities.length || prefEducation.length || prefProfessions.length
                  || practiceLevel || familyExpectation || partnerQualityTags.length || childrenAcceptance;
                if (!hasAnything) return <p className="text-sm text-muted italic">No preferences set yet.</p>;
                return (
                  <div className="space-y-4">
                    {/* Each category gets its own label — a bare row of
                        pills (e.g. two unlabeled "Any" chips) reads as
                        meaningless without knowing which question each one
                        answers. */}
                    {!hasRangeOnly && (
                      <PrefRow label="Age Range"><PrefPill accent>{ageRange[0]}–{ageRange[1]} yrs</PrefPill></PrefRow>
                    )}
                    {prefCities.length > 0 && (
                      <PrefRow label="Preferred Cities">{prefCities.map((c) => <PrefPill key={`c-${c}`}>{c}</PrefPill>)}</PrefRow>
                    )}
                    {prefEducation.length > 0 && (
                      <PrefRow label="Preferred Education">{prefEducation.map((e) => <PrefPill key={`e-${e}`}>{e}</PrefPill>)}</PrefRow>
                    )}
                    {prefProfessions.length > 0 && (
                      <PrefRow label="Preferred Professions">{prefProfessions.map((p) => <PrefPill key={`p-${p}`}>{p}</PrefPill>)}</PrefRow>
                    )}
                    {partnerQualityTags.length > 0 && (
                      <PrefRow label="Partner Qualities">{partnerQualityTags.map((t) => <PrefPill key={`t-${t}`}>{t}</PrefPill>)}</PrefRow>
                    )}
                    {(practiceLevel || familyExpectation || childrenAcceptance) && (
                      <dl className="space-y-2.5 pt-3 border-t border-border/70">
                        {practiceLevel && <KVRow icon={<Sparkles className="w-4 h-4" />} label="Practice level" value={labelize(practiceLevel)} />}
                        {familyExpectation && <KVRow icon={<Home className="w-4 h-4" />} label="Family expectation" value={labelize(familyExpectation)} />}
                        {childrenAcceptance && <KVRow icon={<Baby className="w-4 h-4" />} label="Open to partner with children" value={labelize(childrenAcceptance)} />}
                      </dl>
                    )}
                  </div>
                );
              })()}
            </Card>
          )}
          {isGuest && (practiceLevel || familyExpectation) && (
            <Card title="Partner Preferences" icon={<Heart className="w-4 h-4" />}>
              <dl className="space-y-3">
                {practiceLevel && <KVRow icon={<Sparkles className="w-4 h-4" />} label="Practice level" value={labelize(practiceLevel)} />}
                {familyExpectation && <KVRow icon={<Home className="w-4 h-4" />} label="Family expectation" value={labelize(familyExpectation)} />}
              </dl>
            </Card>
          )}

          {/* Lifestyle */}
          {traitPairs.length > 0 && Object.keys(lifestyleAnswers).length > 0 && (
            <Card title="Lifestyle & Personality" icon={<Sparkles className="w-4 h-4" />} onEdit={!isGuest ? () => setOpenModal('lifestyle') : undefined}>
              <div className="grid grid-cols-2 gap-2.5">
                {traitPairs.filter((p) => lifestyleAnswers[p.slug]).map((p) => {
                  const val = lifestyleAnswers[p.slug];
                  const isLeft = val === p.leftOptionKey;
                  const label = isLeft ? p.leftOptionLabel : p.rightOptionLabel;
                  const iconName = isLeft ? p.leftIconWeb : p.rightIconWeb;
                  return (
                    <div key={p.id} className="border border-dashed border-accent rounded-xl overflow-hidden flex items-stretch">
                      {/* Icon column stretches to match the text column's
                          height (items-stretch on the flex parent) rather
                          than sitting as a small inline glyph. */}
                      <div className="w-11 shrink-0 bg-accent-light text-primary flex items-center justify-center">
                        <LifestyleIcon name={iconName} className="w-5 h-5" />
                      </div>
                      <div className="px-3 py-2.5 min-w-0">
                        <p className="text-[10px] font-semibold text-muted">{p.questionLabel}</p>
                        <p className="text-sm font-bold text-primary truncate">{label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {!isGuest && traitPairs.length > 0 && Object.keys(lifestyleAnswers).length === 0 && (
            <Card title="Lifestyle & Personality" icon={<Sparkles className="w-4 h-4" />} onEdit={() => setOpenModal('lifestyle')}>
              <p className="text-sm text-muted italic">Not answered yet — good to have, the more you share the better your matches.</p>
            </Card>
          )}

          {/* Verification */}
          {!isGuest && <VerificationStatusCard status={verificationStatus} />}
        </div>
      </div>

      {/* ================= Modals ================= */}

      <Modal
        open={openModal === 'about'}
        onClose={() => setOpenModal(null)}
        title="Edit About & Basics"
        footer={<>
          <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted">Cancel</button>
          <button onClick={saveBasics} disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-primary text-surface text-sm font-bold disabled:opacity-50">{isSaving ? 'Saving...' : 'Save changes'}</button>
        </>}
      >
        <Field label="Real name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Gender">
            <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="male">Male</option><option value="female">Female</option>
            </select>
          </Field>
          <Field label="Date of birth"><input type="date" className={inputCls} value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="City"><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          <Field label="Jamaat"><input className={inputCls} value={jamaat} onChange={(e) => setJamaat(e.target.value)} /></Field>
        </div>
        <Field label="Email (optional)"><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Education">
          <div className="flex flex-wrap gap-2 mb-2">
            {OWN_EDUCATION_OPTIONS.map((o) => <Chip key={o} label={o} selected={education === o} onClick={() => setEducation(o)} />)}
          </div>
          {education === 'Other' && <input className={inputCls} value={educationOther} onChange={(e) => setEducationOther(e.target.value)} placeholder="Your education" />}
        </Field>
        <Field label="Profession">
          <div className="flex flex-wrap gap-2 mb-2">
            {OWN_PROFESSION_OPTIONS.map((o) => <Chip key={o} label={o} selected={profession === o} onClick={() => setProfession(o)} />)}
          </div>
          {profession === 'Other' && <input className={inputCls} value={professionOther} onChange={(e) => setProfessionOther(e.target.value)} placeholder="Your profession" />}
        </Field>
        <Field label="Field of study"><input className={inputCls} value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} /></Field>
        <Field label="Intro line / tagline">
          <input className={inputCls} maxLength={100} value={introLine} onChange={(e) => setIntroLine(e.target.value)} />
          <p className="text-xs text-muted mt-1 text-right">{introLine.length}/100</p>
        </Field>
        <Field label="Bio">
          <textarea className={inputCls} rows={5} maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} />
          <p className="text-xs text-muted mt-1 text-right">{bio.length}/300</p>
        </Field>
      </Modal>

      <Modal
        open={openModal === 'family'}
        onClose={() => setOpenModal(null)}
        title="Edit Family Background"
        footer={<>
          <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted">Cancel</button>
          <button onClick={saveBasics} disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-primary text-surface text-sm font-bold disabled:opacity-50">{isSaving ? 'Saving...' : 'Save changes'}</button>
        </>}
      >
        <Field label="Height">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {HEIGHT_PICKER_OPTIONS.map((o) => <Chip key={o.cm} label={o.label} selected={heightCm === o.cm} onClick={() => setHeightCm(o.cm)} className="shrink-0" />)}
          </div>
        </Field>
        <Field label="Preferred language for updates">
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((o) => <Chip key={o.value} label={o.label} selected={preferredLanguage === o.value} disabled={o.value !== 'en'} onClick={() => setPreferredLanguage(o.value)} />)}
          </div>
          <p className="text-xs text-muted mt-1">Gujarati and Urdu are coming soon.</p>
        </Field>
        <Field label="Willing to relocate?">
          <div className="flex flex-wrap gap-2">
            {RELOCATE_OPTIONS.map((o) => <Chip key={o.value} label={o.label} selected={willingToRelocate === o.value} onClick={() => setWillingToRelocate(o.value)} />)}
          </div>
        </Field>
        <Field label="Marital status">
          <div className="flex flex-wrap gap-2">
            {MARITAL_STATUSES.map((o) => <Chip key={o.value} label={o.label} selected={maritalStatus === o.value} onClick={() => setMaritalStatus(o.value)} />)}
          </div>
        </Field>
        <FamilySection
          brothersCount={brothersCount} brothersMarriedCount={brothersMarriedCount}
          sistersCount={sistersCount} sistersMarriedCount={sistersMarriedCount}
          onChange={(u) => {
            if ('brothersCount' in u) setBrothersCount(u.brothersCount ?? null);
            if ('brothersMarriedCount' in u) setBrothersMarriedCount(u.brothersMarriedCount ?? null);
            if ('sistersCount' in u) setSistersCount(u.sistersCount ?? null);
            if ('sistersMarriedCount' in u) setSistersMarriedCount(u.sistersMarriedCount ?? null);
          }}
        />
        <ChildrenSection
          maritalStatus={maritalStatus}
          hasChildren={hasChildren} childrenCount={childrenCount} childrenBoysCount={childrenBoysCount}
          childrenGirlsCount={childrenGirlsCount} childrenLivingStatus={childrenLivingStatus as any}
          onChange={(u) => {
            if ('hasChildren' in u) setHasChildren(u.hasChildren ?? null);
            if ('childrenCount' in u) setChildrenCount(u.childrenCount ?? null);
            if ('childrenBoysCount' in u) setChildrenBoysCount(u.childrenBoysCount ?? null);
            if ('childrenGirlsCount' in u) setChildrenGirlsCount(u.childrenGirlsCount ?? null);
            if ('childrenLivingStatus' in u) setChildrenLivingStatus(u.childrenLivingStatus ?? null);
          }}
        />
      </Modal>

      <Modal
        open={openModal === 'preferences'}
        onClose={() => setOpenModal(null)}
        title="Edit Partner Preferences"
        footer={<>
          <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted">Cancel</button>
          <button onClick={savePreferences} disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-primary text-surface text-sm font-bold disabled:opacity-50">{isSaving ? 'Saving...' : 'Save changes'}</button>
        </>}
      >
        <Field label="Age range">
          <WebRangeSlider label="Age Range" min={AGE_MIN} max={AGE_MAX} values={ageRange} onChange={(v) => setAgeRange([v[0], v[1]])} openEndedMin={false} />
        </Field>
        <Field label="Preferred cities">
          <div className="flex flex-wrap gap-2">{PREF_CITIES.map((c) => <Chip key={c} label={c} selected={isSelected(prefCities, c)} onClick={() => toggleArrayItem(setPrefCities, c)} />)}</div>
        </Field>
        <Field label="Preferred education">
          <div className="flex flex-wrap gap-2">{PREF_EDUCATION.map((e) => <Chip key={e} label={e} selected={isSelected(prefEducation, e)} onClick={() => toggleArrayItem(setPrefEducation, e)} />)}</div>
        </Field>
        <Field label="Preferred professions">
          <div className="flex flex-wrap gap-2">{PREF_PROFESSIONS.map((p) => <Chip key={p} label={p} selected={isSelected(prefProfessions, p)} onClick={() => toggleArrayItem(setPrefProfessions, p)} />)}</div>
        </Field>
        <Field label="Practice level">
          <div className="flex flex-wrap gap-2">{PRACTICE_LEVELS.map((l) => <Chip key={l.value} label={l.label} selected={practiceLevel === l.value} onClick={() => setPracticeLevel(l.value)} />)}</div>
        </Field>
        <Field label="Family expectation">
          <div className="flex flex-wrap gap-2">{FAMILY_EXPECTATIONS.map((e) => <Chip key={e.value} label={e.label} selected={familyExpectation === e.value} onClick={() => setFamilyExpectation(e.value)} />)}</div>
        </Field>
        <Field label="Partner qualities (up to 3)">
          <div className="flex flex-wrap gap-2">
            {QUALITY_TAGS.map((t) => (
              <Chip key={t} label={t} selected={isSelected(partnerQualityTags, t)} disabled={!isSelected(partnerQualityTags, t) && partnerQualityTags.length >= 3} onClick={() => toggleArrayItem(setPartnerQualityTags, t)} />
            ))}
          </div>
        </Field>
        <Field label="Open to a partner with children?">
          <div className="flex flex-wrap gap-2">{CHILDREN_ACCEPTANCE_OPTIONS.map((o) => <Chip key={o.value} label={o.label} selected={childrenAcceptance === o.value} onClick={() => setChildrenAcceptance(o.value)} />)}</div>
        </Field>
      </Modal>

      <Modal open={openModal === 'lifestyle'} onClose={() => setOpenModal(null)} title="Edit Lifestyle & Personality">
        <p className="text-xs text-muted -mt-1 mb-1">Each answer saves the instant you tap it — no Save button needed here.</p>
        <div className="space-y-5">
          {traitPairs.map((pair, i) => (
            <LifestyleToggle key={pair.id} pair={pair} value={lifestyleAnswers[pair.slug]} onChange={(k) => handleLifestyleChange(pair.slug, k)} badgeDelay={i * 0.6} />
          ))}
        </div>
      </Modal>

      <Modal open={openModal === 'privacy'} onClose={() => setOpenModal(null)} title="Photo privacy">
        <p className="text-sm text-muted -mt-1">Choose who can see your photo, and how. You can change this anytime.</p>
        <PhotoPrivacyPicker value={photoPrivacyMode} onChange={savePhotoPrivacy} allowedModes={photoAllowedModes} />
      </Modal>

      <Modal open={openModal === 'photo'} onClose={() => { if (!isUploadingPhoto) setOpenModal(null); }} title="Update profile photo">
        <p className="text-sm text-muted -mt-1">Same crop ratio used at signup, so your photo displays consistently everywhere.</p>
        <ImageUploadWithCrop
          onImageReady={handlePhotoUpload}
          aspect={4 / 5}
          triggerLabel="Click to upload a new photo"
          fileName="profile-photo.jpg"
          disabled={isUploadingPhoto}
        />
        {isUploadingPhoto && <p className="text-xs text-muted">Uploading…</p>}
        {photoUploadError && <p className="text-xs text-danger">{photoUploadError}</p>}
      </Modal>
    </div>
  );
}

function Card({ title, icon, onEdit, children }: { title: string; icon: React.ReactNode; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-accent-light text-primary flex items-center justify-center shrink-0">{icon}</span>
          {title}
        </h2>
        {onEdit && (
          <button onClick={onEdit} className="w-8 h-8 rounded-full border border-border text-muted hover:text-primary hover:border-accent flex items-center justify-center transition-colors" title={`Edit ${title}`}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
      <ShieldCheck className="w-[18px] h-[18px] text-accent shrink-0" />
      ITS Verified
    </span>
  );
}

function PrefPill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
      accent ? 'bg-accent-light text-primary border-accent font-bold' : 'bg-background border-border text-foreground'
    }`}>
      {children}
    </span>
  );
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted font-bold mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function KV({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted font-bold mb-1">{label}</dt>
      <dd className="text-sm font-medium text-foreground flex items-center gap-1.5">{icon}{value}</dd>
    </div>
  );
}

function KVRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <dt className="text-sm text-muted flex items-center gap-2">{icon}{label}</dt>
      <dd className="text-sm font-semibold text-foreground text-right">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
