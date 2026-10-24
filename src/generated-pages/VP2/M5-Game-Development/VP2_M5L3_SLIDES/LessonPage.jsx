import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP2_M5L3_SLIDES() {
  const activity = {
    id: "VP2_M5L3_SLIDES",
    title: "Slide: M5L3 - Variables in games",
    embedUrl: "https://docs.google.com/presentation/d/1CN3Fvatg0r8Ph1Tw9wrwb22bnynRijCc919grE6ZLn4/embed?start=false&loop=false&delayms=3000",
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
