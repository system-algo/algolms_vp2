import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M1L5_SLIDES() {
  const activity = {
    id: "VP_M1L5_SLIDES",
    title: "Slide: M1L5 - Project Showpiece",
    embedUrl: "https://docs.google.com/presentation/d/1M8xg5eSzYMaxzjVHRc4a4iHQpZaENQ6Mzgv9CFg7j_Q/embed?start=false&loop=false&delayms=3000",
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
