import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP2_M5L4_SLIDES() {
  const activity = {
    id: "VP2_M5L4_SLIDES",
    title: "Slide: M5L4 - Variables as parameters",
    embedUrl: "https://docs.google.com/presentation/d/1cCpISAjjmMxjxD2QKyU5ZpEmlVHUuKVBUR3DdlL6o3Y/embed?start=false&loop=false&delayms=3000",
    moduleId: "M5-Game-Development",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP2"
      onBack={() => window.history.back()}
    />
  );
}
