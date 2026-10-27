import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M2L2_SLIDES() {
  const activity = {
    id: "VP_M2L2_SLIDES",
    title: "Slide: M2L2 - Pointing in different directions",
    embedUrl: "https://docs.google.com/presentation/d/1FtGJISGVUoF-72ocorbv1voAC2aXqxe4lylfZW5byg8/embed?start=false&loop=false&delayms=3000",
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
