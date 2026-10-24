import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M3L2_SLIDES() {
  const activity = {
    id: "VP_M3L2_SLIDES",
    title: "Slide: M3L2 - Changing coordinates",
    embedUrl: "https://docs.google.com/presentation/d/1VKYooQFe2zsGrp7D9kk0d6vfEAJrViJDjIhlb4-Avws/embed?start=false&loop=false&delayms=3000",
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
