import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP2_M7L1_SLIDES() {
  const activity = {
    id: "VP2_M7L1_SLIDES",
    title: "Slide: M7L1 - Preparing for the final project",
    embedUrl: "https://docs.google.com/presentation/d/1dA496z31BXmujpP0hvWmlvkeTmS8VJvQOnx7NTnZY3g/embed?start=false&loop=false&delayms=3000",
    moduleId: "M7-Hackathon-Series",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP2"
      onBack={() => window.history.back()}
    />
  );
}
