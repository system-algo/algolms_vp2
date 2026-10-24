import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M2L5_SLIDES() {
  const activity = {
    id: "VP_M2L5_SLIDES",
    title: "Slide: M2L5 - Project Animation",
    embedUrl: "https://docs.google.com/presentation/d/1NUZpLGF3xdun_sdzelXKYQUCDeX62U8xFVTmWmoZMOA/embed?start=false&loop=false&delayms=3000",
    moduleId: "M2-Control-Structures",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
