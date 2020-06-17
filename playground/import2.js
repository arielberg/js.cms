var mysql = require('mysql');
console.log('aaa');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "meshilut"
});


function onSuccess(items) {
    let recordById = {};
    items.forEach(item=>recordById[item.ID] = item);
    let postsById = {};
    Object.keys(recordById).forEach(recordId => {
        postName = recordById[recordId].post_title;
        if (! postName ) postName = '---';
        postParent = recordById[recordId].post_parent;
        content = recordById[recordId].post_content;
        console.log(postParent);
        console.log(Object.keys(postsById));
        if ( postParent == 0 ) { // new post
            let newPost = {
                id: recordId,
                title: postName,
                body: content
            };
            postsById[recordId] = newPost;
            
        }
        else { 
            if ( postsById[recordId] ) {
            console.log('aaaa');
            //Post Revision
            postsById[postParent].title = postName
            postsById[postParent].body = content
            }
            else {
              console.log(recordId);
              console.log(Object.keys(postsById));
            }
        }
    });

    fs = require('fs');

    var searchObj = [];
    Object.keys(postsById).forEach(postId=>{
      searchObj.push(postsById[postId]);
        
        fs.mkdir('post/'+postId, { recursive: true }, (err) => {
            if (err) throw err;
        });
        
        fs.writeFile('post/'+postId+'/index.json', JSON.stringify(postsById[postId]), function (err) {
          if (err) throw err;
          console.log('Saved!');
        });
        postsById[postId].body = postsById[postId].body.replace(/(<([^>]+)>)/ig," ")
    });
    
    fs.writeFile('search/post.json', JSON.stringify(searchObj), function (err) {
      if (err) throw err;
      console.log('Saved!');
    });    
}

con.connect(function(err) {
  if (err) throw err;
  con.query("SELECT * FROM wp4c_posts where post_type IN ('post','revision') ORDER BY ID ASC", function (err, result, fields) {
    if (err) throw err;
    onSuccess(result);
  });
});

/****/