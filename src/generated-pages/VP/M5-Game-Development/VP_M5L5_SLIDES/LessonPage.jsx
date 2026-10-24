import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M5L5_SLIDES() {
  const activity = {
    id: "VP_M5L5_SLIDES",
    title: "Slide: M5L5 - Chatbot. Planning",
    embedUrl: "https://docs.google.com/presentation/d/1pwoyAZ71VNr5cT0pML482TrgXon8pH5Fzw7pr0E45C8/embed?start=false&loop=false&delayms=3000",
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
