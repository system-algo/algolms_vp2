import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M6L1_SLIDES() {
  const activity = {
    id: "VP_M6L1_SLIDES",
    title: "Slide: M6L1 - Classes and objects",
    embedUrl: "https://docs.google.com/presentation/d/1qEkgRVWNRx02ub0xq5nxNw4kSdiJM2Nvjf-WT-wSDmE/embed?start=false&loop=false&delayms=3000",
    moduleId: "M6-Advanced-Projects",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
