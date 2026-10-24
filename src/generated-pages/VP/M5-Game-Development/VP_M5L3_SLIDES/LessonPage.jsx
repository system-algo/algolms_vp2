import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M5L3_SLIDES() {
  const activity = {
    id: "VP_M5L3_SLIDES",
    title: "Slide: M5L3 - Variables in games",
    embedUrl: "https://docs.google.com/presentation/d/1CN3Fvatg0r8Ph1Tw9wrwb22bnynRijCc919grE6ZLn4/embed?start=false&loop=false&delayms=3000",
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
