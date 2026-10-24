import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M5L1_SLIDES() {
  const activity = {
    id: "VP_M5L1_SLIDES",
    title: "Slide: M5L1 - Variables in loops",
    embedUrl: "https://docs.google.com/presentation/d/1k98RX4bifQ8yLElmZHoCDP0CoNAq1yCcGbr95tPlAOw/embed?start=false&loop=false&delayms=3000",
    moduleId: "M5-Game-Development",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
