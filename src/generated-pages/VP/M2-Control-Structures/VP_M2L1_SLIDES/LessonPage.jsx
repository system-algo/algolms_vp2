import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M2L1_SLIDES() {
  const activity = {
    id: "VP_M2L1_SLIDES",
    title: "Slide: M2L1 - Coordinates",
    embedUrl: "https://docs.google.com/presentation/d/1neSeInchT6WL87h81ri-Ad2VLMbMCAQroHzX0p1PXzI/embed?start=false&loop=false&delayms=3000",
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
