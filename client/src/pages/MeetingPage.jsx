import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PreJoinPage from "./PreJoinPage";
import API from "../api/api";
import { WholePageLoader } from "../components/loaders/WholePageLoader";
import VideoCallInterface from "./VideoCallInterface";

export default function MeetingPage() {
  const { meetingCode } = useParams();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState("prejoin");
  const [isHost, setIsHost] = useState(false);
  const [getMeetingResponse, setGetMeetingResponse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if meeting code is valid
    if (!meetingCode) {
      navigate("/404");
    }
    // Validate meeting code format
    const codeRegex = /^([a-zA-Z]{3}-[a-zA-Z]{4}-[a-zA-Z]{3})$/;
    if (!codeRegex.test(meetingCode.trim())) {
      // Redirect to 404 page if meeting code is invalid
      navigate("/404");
      return;
    }

    // Check if the meeting code exists in the database
    (async () => {
      await validateMeetingCode(meetingCode);
    })();
  }, [meetingCode, navigate]);

  const validateMeetingCode = async (code) => {
    try {
      const res = await API.get(`/meeting/${code}`);
      if (res.status === 200) {
        const { host } = res.data;
        setIsHost(host);
        setGetMeetingResponse(res.data);
      }
    } catch (error) {
      navigate("/404");
    }
    setLoading(false);
  };

  return (
    <>
      {loading ? (
        <WholePageLoader />
      ) : (
        <>
          {currentPage === "prejoin" && (
            <PreJoinPage
              meetingCode={meetingCode}
              setCurrentPage={setCurrentPage}
              isHost={isHost}
            />
          )}
          {currentPage === "call" && (
            <VideoCallInterface meetingCode={meetingCode} getMeetingResponse={getMeetingResponse} />
          )}
        </>
      )}
    </>
  );
}
