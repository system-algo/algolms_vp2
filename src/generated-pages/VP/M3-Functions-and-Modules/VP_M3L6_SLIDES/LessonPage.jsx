import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M3L6_SLIDES() {
  const activity = {
    id: "VP_M3L6_SLIDES",
    title: "Slide: M3L6 - Game Presentation",
    embedUrl: "https://docs.google.com/presentation/d/1Q3iYLccwcNtC_nLv79V48hoyGbR7oSH_khLdz1n20Ik/embed?start=false&loop=false&delayms=3000",
    moduleId: "M3-Functions-and-Modules",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
