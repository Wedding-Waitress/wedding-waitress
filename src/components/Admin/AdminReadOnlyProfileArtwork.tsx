import {ProfileAvatar} from '@/components/Account/ProfileAvatar';
import styles from '@/components/Account/ProfileImageEditor.module.css';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
export function AdminReadOnlyProfileArtwork({ownerId,email,artwork}:{ownerId:string;email:string;artwork:unknown}){
 const row=artwork as Record<string,any>|null;
 const nullable=(value:unknown)=>value===null||typeof value==='string';
 const source=!!row&&row.user_id===ownerId&&nullable(row.first_name)&&nullable(row.last_name)&&nullable(row.image_path);
 const geometry=source&&['cover','contain'].includes(row.fit)&&['position_x','position_y'].every(key=>typeof row[key]==='number'&&Number.isFinite(row[key])&&row[key]>=0&&row[key]<=100);
 const hasImage=source&&!!row.image_path;
 const media=useAdminPreviewMedia(ownerId,'','profile_image',ownerId,!!hasImage&&!!geometry,row?.image_path);
 if(!source)return <p>Saved profile artwork information is unavailable.</p>;
 if(hasImage&&!geometry)return <p role="alert">Complete saved profile image geometry is unavailable. No replacement image has been substituted.</p>;
 if(hasImage&&!media.url)return <p role={media.error?'alert':'status'}>{media.error?'The saved profile image could not be verified.':'Checking verified read-only access to the saved profile image…'}</p>;
 const profile={first_name:row.first_name,last_name:row.last_name,email,profile_image_url:hasImage?media.url:null,
  profile_image_fit:hasImage?row.fit:'cover',profile_image_position_x:hasImage?row.position_x:50,profile_image_position_y:hasImage?row.position_y:50};
 return <section className={styles.editor} aria-label="Read-only profile artwork"><div className={styles.avatarWrap}>
  <ProfileAvatar profile={profile} decorative={false} className={styles.avatar} imageClassName={hasImage&&row.fit==='contain'?styles.containedImage:undefined}/>
 </div><div className={styles.editorBody}><h3>Profile Photo or Business Logo</h3>
  <p>{hasImage?'Verified saved private account image. Read-only.':'No saved profile image; showing the existing account initials.'}</p></div></section>;
}
