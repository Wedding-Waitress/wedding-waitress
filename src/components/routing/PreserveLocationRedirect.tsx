import { Navigate, useLocation, useParams } from 'react-router-dom';

export const PreserveLocationRedirect = ({ to }: { to: string }) => {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
};

export const LegacyLiveSlideshowViewRedirect = () => {
  const { eventSlug = '' } = useParams<{ eventSlug: string }>();
  const { search, hash } = useLocation();

  return (
    <Navigate
      to={{
        pathname: `/live-slideshow/${encodeURIComponent(eventSlug)}`,
        search,
        hash,
      }}
      replace
    />
  );
};
