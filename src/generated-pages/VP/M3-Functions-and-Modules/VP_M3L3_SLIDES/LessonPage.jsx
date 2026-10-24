import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M3L3_SLIDES() {
  const activity = {
    id: "VP_M3L3_SLIDES",
    title: "Slide: M3L3 - Procedures",
    embedUrl: "https://docs.google.com/presentation/d/1PkASBZY6MJgsYQ5J51cwFpRwNkXphtoBSHYzXJfjn9s/embed?start=false&loop=false&delayms=3000",
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
