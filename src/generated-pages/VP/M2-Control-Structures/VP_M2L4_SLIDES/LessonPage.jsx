import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M2L4_SLIDES() {
  const activity = {
    id: "VP_M2L4_SLIDES",
    title: "Slide: M2L4 - Messages",
    embedUrl: "https://docs.google.com/presentation/d/1BOVWKEFyoEInJ497qYAESkGgyJ7nSa-2N-5JyX-8FRM/embed?start=false&loop=false&delayms=3000",
    moduleId: "M2-Control-Structures",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
