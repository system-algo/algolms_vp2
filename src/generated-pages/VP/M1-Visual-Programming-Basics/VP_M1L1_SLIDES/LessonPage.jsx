import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M1L1_SLIDES() {
  const activity = {
    id: "VP_M1L1_SLIDES",
    title: "Slide: M1L1 - Linear algorithm",
    embedUrl: "https://docs.google.com/presentation/d/e/2PACX-1vQXgMaW-PJEOf9NcZSGtrFjkyYPUE3XxK_JKsQ6Jndnr77jqwLJ_JiPq5TkqY31iV0rUrVqQIcJRvqn/pubembed?start=false&loop=false&delayms=3000",
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
