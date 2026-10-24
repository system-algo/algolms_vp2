import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M5L6_SLIDES() {
  const activity = {
    id: "VP_M5L6_SLIDES",
    title: "Slide: M5L6 - Project. Presentation",
    embedUrl: "https://docs.google.com/presentation/d/1zpkyORarAFsYzQ1UEoQrp6s9XgzlZHF5vuX68dwAmIA/embed?start=false&loop=false&delayms=3000",
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
