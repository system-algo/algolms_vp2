import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP2_M5L2_SLIDES() {
  const activity = {
    id: "VP2_M5L2_SLIDES",
    title: "Slide: M5L2 - Data types and operators",
    embedUrl: "https://docs.google.com/presentation/d/1S9ajnwjwRT086kDRM9bc7Hci4A0vT5wr35kMIhTML0c/embed?start=false&loop=false&delayms=3000",
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
