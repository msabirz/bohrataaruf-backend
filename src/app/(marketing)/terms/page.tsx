import React from 'react';
import { Metadata } from 'next';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms and conditions for using ${APP_NAME}.`,
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-6 py-24 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose prose-zinc max-w-none text-muted space-y-6">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">1. Acceptance of Terms</h2>
        <p>
          By accessing and using {APP_NAME}, you accept and agree to be bound by the terms and provisions of this agreement.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">2. Eligibility</h2>
        <p>
          You must be at least 18 years of age and a verified member of the Dawoodi Bohra community (possessing a valid ITS number) to use this service. 
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">3. User Conduct</h2>
        <p>
          You agree to use {APP_NAME} respectfully and solely for the purpose of finding a matrimonial match. Harassment, abuse, or inappropriate behavior will result in immediate account termination.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">4. Account Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the application.
        </p>
        
        <h2 className="text-2xl font-semibold text-foreground mt-12 mb-4">5. Disclaimer of Warranties</h2>
        <p>
          {APP_NAME} is provided on an "as is" and "as available" basis. We make no warranties regarding the accuracy of profiles or the outcome of using the platform.
        </p>
      </div>
    </div>
  );
}
