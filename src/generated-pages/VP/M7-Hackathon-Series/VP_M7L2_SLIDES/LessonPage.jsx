import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M7L2_SLIDES() {
  const activity = {
    id: "VP_M7L2_SLIDES",
    title: "Slide: M7L2 - Graduation",
    embedUrl: "https://docs.google.com/presentation/d/1_afhy3iL17WmYuAL0vzrrpiE0C2yKLPOlW-FcnDvIF0/embed?start=false&loop=false&delayms=3000",
    moduleId: "M7-Hackathon-Series",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
