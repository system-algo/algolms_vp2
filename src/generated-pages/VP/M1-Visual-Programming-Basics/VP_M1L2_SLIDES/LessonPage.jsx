import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M1L2_SLIDES() {
  const activity = {
    id: "VP_M1L2_SLIDES",
    title: "Slide: M1L2 - Loops",
    embedUrl: "https://docs.google.com/presentation/d/1Pc_EcgdCdf8jy58TzCPT7E4XJ7q-CWHKr1aqj3N3mL4/embed?start=false&loop=false&delayms=3000",
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
