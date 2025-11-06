const WebSocket = require("ws");
const fs = require('fs');
const MESSAGE_TYPE = {
  transaction: "TRANSACTION",
  prepare: "PREPARE",
  pre_prepare: "PRE-PREPARE",
  commit: "COMMIT",
  view_change: "VIEW-CHANGE",
  new_view: "NEW VIEW",
  election: "ELECTION"
};
class Node
{
    constructor(myid,P2P_PORT,peers)
    {
        this.own_message_pool = new Set();
        this.started_message_pool = new Set();
        this.current_view_number = 0;
        this.nodeID = myid;
        this.current_sequence_number = 0;
        this.message_map = {}; 
        this.prepare_pool = {};
        this.commit_pool = {};
        this.viewChange_pool = {};
        this.final_commits = {};
        this.P2P_PORT = P2P_PORT;
        this.sockets = [];
        this.peers = peers;
        this.prepared = new Set();
        this.committed_local = new Set();
        this.sleep_mode = false;
        this.message_timers = new Map();
        this.timeout_duration = 60000;
        this.speaker_timer = {}
        this.viewChange_count = 0;
        this.vote_pool = [];
        this.election_timer = null;
        this.delegateList = [1,2,3,4];
        this.validatorList = [1,2,3,4,5];
        this.isValidator = false;
        this.isDelegate = false;
        this.viewchanged = false;
        if(this.validatorList.includes(this.nodeID)){ this.isValidator = true;}
        if(this.delegateList.includes(this.nodeID)){ this.isDelegate = true;}
        this.raisedViewChange = false;
        this.viewChange_pool[0] = [null,null,null];
        this.byz = false;
        for(let i = 1;i<7;i++)
        {
          this.speaker_timer[i] = null;
        }
        if(this.isDelegate) 
        {this.speaker_timer[0] = setTimeout(() => {
          if(this.current_view_number==0){
          console.log(`Timer expired for 0`);
      // Handling timeout here
          this.initiate_view_change(this.current_view_number);
         
      // this.raisedViewChange = true;
    }
    }, 2*this.timeout_duration);
  
      }

        
    }
    
    async add_own_message(message)
    {
        if (!this.own_message_pool.has(message)) {
            this.own_message_pool.add(message);
        }
    }

    listen() {
    console.log(this.P2P_PORT);
    const server = new WebSocket.Server({ port: this.P2P_PORT });
    server.on("connection", socket => {
      console.log("new connection");
      this.connectSocket(socket);
    });
    this.connectToPeers();
    console.log(`Listening for peer to peer connection on port : ${this.P2P_PORT}`);
  }

    connectSocket(socket) {
    this.sockets.push(socket);
    console.log("Socket connected");
    this.messageHandler(socket);
  }
    connectToPeers() {
    this.peers.forEach(peer => {
      const socket = new WebSocket(peer);
      socket.on("open", () => this.connectSocket(socket));
    });
  }

    broadcastPrePrepare(block) {
          this.sockets.forEach(socket => {
      this.sendPrePrepare(socket,block );
    });
  }

    sendPrePrepare(socket, preprepare) {
    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPE.pre_prepare,
        preprepare: preprepare
      })
    );
  }

   broadcastPrepare(prepare) {
        this.sockets.forEach(socket => {
      this.sendPrepare(socket, prepare);
    });
    
  }

  // sends prepare to a particular socket
  sendPrepare(socket, prepare) {
    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPE.prepare,
        prepare: prepare
      })
    );
  }

  // broadcasts commit
 broadcastCommit(commit) {
    this.sockets.forEach(socket => {
      this.sendCommit(socket, commit);
    });
  }

  // sends commit to a particular socket
  sendCommit(socket, commit) {
    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPE.commit,
        commit: commit
      })
    );
  }

   broadcastViewChange(viewChange) {
    this.sockets.forEach(socket => {
      this.sendViewChange(socket, viewChange);
    });
  }

  // sends view change request to a particular socket
 sendViewChange(socket, viewChange) {
    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPE.view_change,
        view_change : viewChange
      })
    );
  }

 async initiate_view_change( current_view_number)
  {
    console.log("VIEW CHANGE REQUESTED");
    
    let viewChange = {
      view : (current_view_number + 1),
      current_sequence_number : this.current_sequence_number,
      nodeID : this.nodeID
    };


    if(this.viewChange_pool.hasOwnProperty(viewChange.view))
    {
      this.viewChange_pool[viewChange.view].push(viewChange);
      if(this.viewChange_pool[viewChange.view].length>=3 && !this.viewchanged)
      {
        this.viewchanged = true;
        this.current_view_number = viewChange.view;
        if(this.current_view_number==7)
        {
          console.log("Election");
          this.initiate_election();

                  this.election_timer = setTimeout(() => {
                    console.log(`Timer expired for election in node: ${this.nodeID}`);
                    // Handling timeout here
                    this.decideResult();
                    // this.clearAllTimers(); 

                  }, this.timeout_duration);
          
        }
        else if(this.nodeID==this.current_view_number)
        {
          this.initiate_new_view(this.nodeID,this.viewChange_pool[this.nodeID]);
        }
        else if(this.delegateList.includes(this.nodeID))
                  {
                    let new_view_propose = this.current_view_number+1;
                    if(this.speaker_timer[this.current_view_number] == null){
                    this.speaker_timer[this.current_view_number] = setTimeout(() => {
                    if(this.current_view_number+1==new_view_propose ){
                      this.speaker_timer[this.current_view_number] = null;
                        console.log(`Timer expired  for speaker delegate: ${this.current_view_number}`)
                      this.initiate_view_change(this.current_view_number);
                      }
                      }, this.timeout_duration);
                  }}
      }
    }
    else
    {
      this.viewChange_pool[viewChange.view] = [viewChange];
      this.viewchanged = false;
    }
    this.broadcastViewChange(viewChange);
  
  }

  broadcastNewView(newView) {
    this.sockets.forEach(socket => {
      this.sendNewView(socket, newView);
    });
  }

  // send new view message to a particular socket
 sendNewView(socket, newView) {
    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPE.new_view,
        new_view : newView
      })
    );
  }

   broadcastVote(vote) {
    this.sockets.forEach(socket => {
      this.sendVote(socket, vote);
    });
  }

   sendVote(socket, vote) {
    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPE.election,
        vote : vote
      })
    );
  }


  initiate_new_view(new_view , proofs){
    console.log("VIEW CHANGE INITIATED");
       console.log(proofs.length);
    let newView = {
      view : new_view,
      proofs : proofs,
      nodeID : this.nodeID
    };
    this.broadcastNewView(newView);
    while(this.own_message_pool.size > 0)
    {
        let messagesIterator = this.own_message_pool.values();
        let message = messagesIterator.next().value;
        this.own_message_pool.delete(message);
        this.started_message_pool.add(message);
        // this.current_sequence_number++;
        this.initiate_preprepare(this.current_sequence_number, message, this.current_view_number);

    }
  }

  initiate_election(){
    console.log("Election started");
    let vote = {
      vote : Math.floor(Math.random() * 100),
      nodeID : this.nodeID
    };
    this.vote_pool.push(vote);
    this.broadcastVote(vote);
  }

 async initiate_prepare(sequence_number,message, view_number)
  {
    console.log("Inside Initiate prepare");
   let  prepare = {
        sequence_number:sequence_number,
        message:message,
        view_number:view_number,
        nodeID:this.nodeID
    };
   
    if(this.prepare_pool.hasOwnProperty(sequence_number))
    {
        this.prepare_pool[sequence_number].push(prepare);
        if(this.prepare_pool[prepare.sequence_number].length >= 3 && !this.prepared.has(prepare.sequence_number))// 2f+1
        {
            this.prepared.add(prepare.sequence_number);
            this.initiate_commit(prepare.sequence_number,prepare.message,prepare.view_number);   
        }
    }
    else
    {
        this.prepare_pool[sequence_number] = [prepare];
    }
    this.broadcastPrepare(prepare);
  }
 async initiate_preprepare(sequence_number,message, view_number)
  {
    console.log("Inside Initiate pre-prepare");
    let preprepare = {
        sequence_number:sequence_number,
        message:message,
        view_number:view_number,
        nodeID:this.nodeID
    };
    this.message_map[preprepare.sequence_number] = preprepare.message;
      this.broadcastPrePrepare(preprepare);
      this.initiate_prepare(sequence_number,message,view_number);
    
    
    
  }
 initiate_commit(sequence_number,message, view_number)
  {
    console.log("Inside Initiate commit");
  let  commit = {
        sequence_number:sequence_number,
        message:message,
        view_number:view_number,
        nodeID:this.nodeID
    };
    if(this.commit_pool.hasOwnProperty(sequence_number))
    {
        this.commit_pool[sequence_number].push(commit);
    }
    else
    {
        this.commit_pool[sequence_number] = [commit];
    }
    this.broadcastCommit(commit);
  }
  committed(message,sequence_number,view_number)
  {
    console.log("Inside committed func");
    console.log("Sequence Number:",sequence_number," Message: ",message);
    let data = `Sequence Number: ${sequence_number}, Message: ${JSON.stringify(message)}\n`;
    fs.appendFile(`${this.nodeID}.txt`, data, (err) => {
        if (err) throw err;
        console.log('The "data to append" was appended to file!');
    });
    if(!this.final_commits.hasOwnProperty(sequence_number)) this.final_commits[sequence_number] = message;
    this.current_sequence_number = Math.max(this.current_sequence_number,sequence_number);
    delete this.prepare_pool[sequence_number];
    delete this.commit_pool[sequence_number];
    // delete this.message_map[sequence_number];
    this.started_message_pool.forEach((point) => {if(point.temporary == message.temporary ) this.started_message_pool.delete(point);});
    
  }

  decideResult(){

    this.vote_pool.sort((a,b) => a.vote - b.vote);


    this.delegateList = []

    this.validatorList = []

    console.log("Delegates: ",this.vote_pool.slice(0,4));
    console.log("Validators: ",this.vote_pool.slice(0,5));


    
    for(let i = 0;i<4;i++)
    {
      this.delegateList.push(this.vote_pool[i].nodeID);
    }

    for(let i = 0;i<5;i++)
    {
      this.validatorList.push(this.vote_pool[i].nodeID);
    }


    this.vote_pool = [];
    this.current_view_number = 0;
    this.viewChange_pool[0] = [null,null,null];


                this.started_message_pool.forEach(element => {
            this.own_message_pool.add(element);
            });
          
    for(let i = 1; i<7 ;i++)
    {
      delete this.viewChange_pool[i];
    }

    this.started_message_pool.clear();
    if(this.delegateList.includes(this.nodeID)) 
        {this.speaker_timer[0] = setTimeout(() => {
          if(this.current_view_number==0){
          console.log(`Timer expired for 0`);
          this.initiate_view_change(this.current_view_number);
    }
    }, this.timeout_duration);
  
    }
    if(this.nodeID==0)
    {
      this.initiate_new_view(0,[null,null,null]);
    }


    
  }


  async messageHandler(socket) {
    // registers message handler
    socket.on("message", message => {
      const data = JSON.parse(message);

    switch (data.type) {
        case MESSAGE_TYPE.pre_prepare:
            console.log("Current View:", this.current_view_number," preprepare view: ",data.preprepare," preprepare node ID:", data.preprepare.nodeID," sleep mode:", this.sleep_mode," sequence number:",data.preprepare.sequence_number);
            if(this.delegateList.includes(this.nodeID) && this.current_view_number ==data.preprepare.view_number && this.current_view_number == data.preprepare.nodeID  && ((!this.message_map.hasOwnProperty(data.preprepare.sequence_number))||data.preprepare.nodeID == this.nodeID))
            {
              console.log("Inside Pre-Prepare");
              let preprepare = data.preprepare;
              this.message_map[preprepare.sequence_number] = preprepare.message;
              this.initiate_prepare(preprepare.sequence_number,preprepare.message,preprepare.view_number);  
            }
            break;

        case MESSAGE_TYPE.prepare:
          if(this.validatorList.includes(this.nodeID) && this.current_view_number ==data.prepare.view_number && this.delegateList.includes(data.prepare.nodeID) )
            {
                console.log("PREPARE RECEIVED: ",data.prepare);
                let prepare = data.prepare;
                if(this.message_map.hasOwnProperty(prepare.sequence_number))
                {
                    if(this.prepare_pool.hasOwnProperty(prepare.sequence_number))
                    {
                      let message_present = false;
                      let prepareMessages = this.prepare_pool[prepare.sequence_number];
                      for (let i = 0; i < prepareMessages.length; i++) 
                      {
                        if (prepareMessages[i] === prepare) 
                        {
                          message_present = true;
                          break;
                        }
                      }
                      if(!message_present)
                      {
                        this.prepare_pool[prepare.sequence_number].push(prepare);
                      }
                      if(this.prepare_pool[prepare.sequence_number].length >= 3 && !this.prepared.has(prepare.sequence_number))// 2f+1
                      {
                        this.prepared.add(prepare.sequence_number);
                        this.initiate_commit(prepare.sequence_number,prepare.message,prepare.view_number);   
                      }
                    }
                    else
                    {
                      this.prepare_pool[prepare.sequence_number] = [prepare];
                    }
                }
                else
                {
                  this.message_map[prepare.sequence_number] = prepare.message;
                  this.prepare_pool[prepare.sequence_number] = [prepare];
                }
            }
          break;

        case MESSAGE_TYPE.commit:
            if(this.current_view_number ==data.commit.view_number && this.validatorList.includes(data.commit.nodeID) )
            {
              console.log("COMMIT RECEIVED: ",data.commit);
              let commit = data.commit;
              if(this.message_map.hasOwnProperty(commit.sequence_number))
              {
                if(this.commit_pool.hasOwnProperty(commit.sequence_number))
                {
                  let  message_present = false;
                  let commitMessages = this.commit_pool[commit.sequence_number];
                  for (let i = 0; i < commitMessages.length; i++)
                  {
                    if (commitMessages[i] === commit) 
                    {
                      message_present = true;
                      break;
                    }
                  }
                  if(!message_present)
                  {
                    this.commit_pool[commit.sequence_number].push(commit);
                  }
                  if(this.commit_pool[commit.sequence_number].length >= 3  && !this.committed_local.has(commit.sequence_number))
                  {
                    this.committed_local.add(commit.sequence_number);
                    this.committed(commit.message,commit.sequence_number,commit.view_number); 
                  }
                }
                else
                {
                  this.commit_pool[commit.sequence_number] = [commit];
                }
              }
              else
              {
                this.message_map[commit.sequence_number] = commit.message;
                this.commit_pool[commit.sequence_number] = [commit];   
              }
            }
          break;

        case MESSAGE_TYPE.view_change:

          let viewChange = data.view_change;
          let new_view = viewChange.view;
          if(new_view == this.current_view_number+1)
          {
            console.log("RECEIVED VIEW CHANGE:",viewChange);
          if(this.viewChange_pool.hasOwnProperty(new_view))
          {
            let message_present = false;
            let viewChangeMessages = this.viewChange_pool[new_view];
            for(let i = 0; i<viewChangeMessages.length; i++){
              if(viewChangeMessages[i].nodeID == viewChange.nodeID)
              {
                message_present = true;
                break;
              }
            }
            if(!message_present && viewChange.nodeID<7 && viewChange.nodeID >= 0)
            {
              
              this.viewChange_pool[new_view].push(viewChange);
              console.log('current view:',this.current_view_number,'My id: ', this.nodeID,' viewchangepool.length: ',this.viewChange_pool[new_view].length);
              if( this.viewChange_pool[new_view].length >=  3 && !this.viewchanged){
                this.viewchanged = true;
                clearTimeout(this.speaker_timer[new_view-1]);
                if(new_view  == 7)
                {
                  console.log("INSIDE ELECTION");
                  this.initiate_election();
                  this.election_timer = setTimeout(() => {
                    console.log(`Timer expired for election in node: ${this.nodeID}`);
                    this.decideResult();              
                  }, this.timeout_duration);
                }
                else
                {
                  this.current_view_number = new_view;
                  if(this.nodeID==new_view)
                  { 
                    console.log('New leader: ',this.nodeID);
                    console.log(this.viewChange_pool[this.nodeID].length);
                    this.initiate_new_view(this.nodeID, this.viewChange_pool[this.nodeID]);
                
                  }
                  if(this.delegateList.includes(this.nodeID))
                  {
                    let new_view_propose = this.current_view_number+1;
                    if(this.speaker_timer[this.current_view_number]==null)
                    {
                      this.speaker_timer[this.current_view_number] = setTimeout(() => {
                      if(this.current_view_number+1==new_view_propose )
                      {
                        this.speaker_timer[this.current_view_number] = null;
                        console.log(`Timer expired  for speaker delegate: ${this.current_view_number}`)
                        this.initiate_view_change(this.current_view_number);
                      }
                        }, this.timeout_duration);
                    }
                  }
                }
                
            }
            }
          }
          else
          {
            if(viewChange.nodeID<7 && viewChange.nodeID >=0)
            {
              this.viewchanged = false;
              this.viewChange_pool[new_view] = [viewChange];
            }
          }
        }
        break;

        case MESSAGE_TYPE.new_view:
          let newView = data.new_view;
          console.log("RECEIVED NEW VIEW",data.newView);
          if(newView.view==this.current_view_number)
          {
            let proofs = newView.proofs;
            if(proofs.length<3)
            {
              console.log("INVALID PROOF LENGTH");
              this.initiate_view_change(this.current_view_number);
              
            }
          }
          if(this.delegateList.includes(this.nodeID)){
          let curspeaker = newView.view;
          if(this.speaker_timer[curspeaker]==null){
          this.speaker_timer[curspeaker] = setTimeout(() => {
            if(this.current_view_number==curspeaker)
              {
                console.log(`Timer expired  for speaker delegate after new view: ${this.current_view_number}`);
                this.speaker_timer[this.current_view_number] = null;
                this.initiate_view_change(this.current_view_number);
              }
              }, this.timeout_duration);}}
          break;

        case MESSAGE_TYPE.election:
          console.log('RECEIVED VOTE: ',data.vote);
          let vote = data.vote;
          this.vote_pool.push(vote);
      } 
    });
  }
}

module.exports = Node;