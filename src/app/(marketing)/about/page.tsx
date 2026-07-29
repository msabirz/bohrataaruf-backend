import React from 'react';
import { Metadata } from 'next';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export const metadata: Metadata = {
  title: `About Us | ${APP_NAME}`,
  description: `Learn why we built ${APP_NAME} and what we believe about privacy, dignity, and connecting the Dawoodi Bohra community.`,
};

export default function AboutPage() {
  return (
    <div className="bg-background min-h-screen pt-24 pb-32 px-6">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-12">About Us</h1>
        
        <div className="prose prose-lg prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted prose-li:text-muted max-w-none">
          <h2>Why we built this</h2>
          <p>
            Every family in our community knows the feeling — a son or daughter ready for marriage, and no clear, comfortable way to actually meet someone suitable. Traditional introductions rely on who your family happens to know. Existing apps ask for a subscription before you can see anything real, and are often built more like dating apps than something a community would trust with something this important.
          </p>
          <p>
            We built {APP_NAME} because our community deserves better than both of those options — something private, respectful, verified, and completely free.
          </p>

          <h2>What we believe</h2>
          <ul className="space-y-2 mb-8 list-disc pl-6">
            <li>Marriage introductions should be dignified, not transactional</li>
            <li>Privacy isn't a premium feature — it's the baseline</li>
            <li>Technology should make this easier for families and individuals, not exploit them</li>
            <li>A stronger, more connected community starts with helping people actually find each other</li>
          </ul>

          <h2>Who this is for</h2>
          <p>
            Every verified member of the Dawoodi Bohra community, wherever they are — because geography shouldn't be the reason two right-fit people never meet.
          </p>
        </div>
      </div>
    </div>
  );
}
