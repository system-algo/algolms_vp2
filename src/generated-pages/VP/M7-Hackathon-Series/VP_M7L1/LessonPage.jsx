import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M7L1() {
  const activity = {
    id: "VP_M7L1",
    title: "VP M7L1",
    taskCount: 5,
    h5pPlayUrl: "/courses/VP/M7-Hackathon-Series/pages/VP_M7L1/workspace",
    moduleId: "M7-Hackathon-Series",
  };

  return (
    <H5pPlayerPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
