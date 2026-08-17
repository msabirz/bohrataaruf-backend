import React from 'react';
import { Metadata } from 'next';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How we protect your data and privacy at ${APP_NAME}.`,
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-6 py-24 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-zinc max-w-none text-muted space-y-6">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">1. Introduction</h2>
        <p>
          At {APP_NAME}, we take your privacy incredibly seriously. Because our platform is built exclusively for the Dawoodi Bohra community, we understand the cultural nuances and privacy expectations involved in matchmaking.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">2. Data Collection & Verification</h2>
        <p>
          We collect your ITS number strictly for verification purposes. This ensures that every profile on our platform belongs to a verified member of the community. Your ITS number is never displayed publicly on your profile.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">3. Alias & Photo Privacy</h2>
        <p>
          To protect your identity while browsing:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your real name is replaced with a generated alias (e.g., "Creative Architect").</li>
          <li>Your profile photos are heavily blurred by default.</li>
          <li>Users must actively tap to view your photos, and we rate-limit these views to prevent scraping.</li>
          <li>We employ OS-level screenshot blocking on our mobile apps to prevent unauthorized distribution of your photos.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">4. Mutual Matches</h2>
        <p>
          Your real name and contact information are only revealed to another user if and when you both mutually express interest in each other. Until that mutual match occurs, you remain completely anonymous.
        </p>
        
        <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">5. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at support@bohrataaruf.com.
        </p>
      </div>
    </div>
  );
}
