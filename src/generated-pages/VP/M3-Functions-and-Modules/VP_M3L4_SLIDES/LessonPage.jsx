import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M3L4_SLIDES() {
  const activity = {
    id: "VP_M3L4_SLIDES",
    title: "Slide: M3L4 - Game planning",
    embedUrl: "https://docs.google.com/presentation/d/16gWVeHKs2yntMI7S9kWE_OzTT2dihP5AAoUOfL6gMwg/embed?start=false&loop=false&delayms=3000",
    moduleId: "M3-Functions-and-Modules",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
