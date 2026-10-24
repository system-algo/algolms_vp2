import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP2_M3L5_SLIDES() {
  const activity = {
    id: "VP2_M3L5_SLIDES",
    title: "Slide: M3L5 - Game Testing",
    embedUrl: "https://docs.google.com/presentation/d/1BuDA9dxETjfQPs5LSgR6ZkO26CUuD5nbJlezjj8jcCc/embed?start=false&loop=false&delayms=3000",
    moduleId: "M3-Functions-and-Modules",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP2"
      onBack={() => window.history.back()}
    />
  );
}
