import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP2_M2L3_SLIDES() {
  const activity = {
    id: "VP2_M2L3_SLIDES",
    title: "Slide: M2L3 - Turns and degrees",
    embedUrl: "https://docs.google.com/presentation/d/1dMAi8KV5Jm8tMhJt9kE4l1EkcHbaZGa83pQ57qd93JE/embed?start=false&loop=false&delayms=3000",
    moduleId: "M2-Control-Structures",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP2"
      onBack={() => window.history.back()}
    />
  );
}
