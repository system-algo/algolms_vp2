import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M1L3_SLIDES() {
  const activity = {
    id: "VP_M1L3_SLIDES",
    title: "Slide: M1L3 - Initial arrangement and planning",
    embedUrl: "https://docs.google.com/presentation/d/1E7no47JxMTHF4tqQKgZ82bX-WTLNtykct0eLsFx7t9A/embed?start=false&loop=false&delayms=3000",
    moduleId: "M1-Visual-Programming-Basics",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
